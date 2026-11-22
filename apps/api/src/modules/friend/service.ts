import { wornOrnament } from "@repo/ranked-engine";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import {
  type Db,
  type Transaction,
  friendRequest,
  friendship,
  standing,
  user,
} from "../../db/client.ts";
import { rankFromStored } from "../standing/service.ts";

const listedColumns = {
  id: user.id,
  nickname: user.nickname,
  avatarUrl: user.image,
  choice: user.ornament,
  ladderIndex: standing.ladderIndex,
  lp: standing.lp,
};

type ListedRow = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  choice: (typeof user.$inferSelect)["ornament"];
  ladderIndex: number | null;
  lp: number | null;
};

// Only a Player who may appear publicly: with a Nickname, and not banned.
const isListable = and(isNotNull(user.nickname), isNull(user.bannedAt));

// What a Friend, a Friend request or a search result shows of a Player.
const listed = (rows: ListedRow[]) =>
  rows.flatMap(({ id, nickname, avatarUrl, choice, ladderIndex, lp }) => {
    if (nickname === null) return [];
    const rank = rankFromStored(ladderIndex, lp);
    return [{ id, nickname, avatarUrl, rank, ornament: wornOrnament(choice, rank) }];
  });

// A Player who never played ranked has no Standing row and is Unranked.
const selectListed = (db: Db) =>
  db.select(listedColumns).from(user).leftJoin(standing, eq(standing.playerId, user.id));

/** The Player's received and sent Friend requests, newest first, with the other Player of each. */
export const readFriendRequests = async (db: Db, playerId: string) => {
  const [received, sent] = await Promise.all([
    selectListed(db)
      .innerJoin(friendRequest, eq(friendRequest.senderId, user.id))
      .where(and(eq(friendRequest.receiverId, playerId), isListable))
      .orderBy(desc(friendRequest.createdAt)),
    selectListed(db)
      .innerJoin(friendRequest, eq(friendRequest.receiverId, user.id))
      .where(and(eq(friendRequest.senderId, playerId), isListable))
      .orderBy(desc(friendRequest.createdAt)),
  ]);
  return { received: listed(received), sent: listed(sent) };
};

// The pair as `friendship` stores it: the lower id first, in the byte order its check compares.
const orderedPair = (playerId: string, otherId: string) =>
  playerId < otherId ? ([playerId, otherId] as const) : ([otherId, playerId] as const);

const friendshipOf = (playerId: string, otherId: string) => {
  const [lower, higher] = orderedPair(playerId, otherId);
  return and(eq(friendship.lowerPlayerId, lower), eq(friendship.higherPlayerId, higher));
};

const requestFrom = (senderId: string, receiverId: string) =>
  and(eq(friendRequest.senderId, senderId), eq(friendRequest.receiverId, receiverId));

// Until the transaction ends, so that two Players sending each other a request at the same instant
// cannot both leave theirs pending, nor an answer cross a new request.
const lockPair = async (tx: Transaction, playerId: string, otherId: string) => {
  const [lower, higher] = orderedPair(playerId, otherId);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`friend:${lower}:${higher}`}, 0))`,
  );
};

const areFriends = async (tx: Transaction, playerId: string, otherId: string) =>
  (
    await tx
      .select({ lower: friendship.lowerPlayerId })
      .from(friendship)
      .where(friendshipOf(playerId, otherId))
  ).length > 0;

const befriend = async (tx: Transaction, playerId: string, otherId: string, at: Date) => {
  const [lowerPlayerId, higherPlayerId] = orderedPair(playerId, otherId);
  await tx.insert(friendship).values({ lowerPlayerId, higherPlayerId, createdAt: at });
};

/** How many Friends a Player may have. */
export const MAX_FRIENDS = 200;

/** How many of a Player's sent Friend requests may wait at once. */
export const MAX_PENDING_SENT_REQUESTS = 50;

const countFriends = async (tx: Transaction, playerId: string) => {
  const [row] = await tx
    .select({ friends: count() })
    .from(friendship)
    .where(or(eq(friendship.lowerPlayerId, playerId), eq(friendship.higherPlayerId, playerId)));
  return row?.friends ?? 0;
};

const isFull = async (tx: Transaction, playerId: string) =>
  (await countFriends(tx, playerId)) >= MAX_FRIENDS;

const countPendingSent = async (tx: Transaction, playerId: string) => {
  const [row] = await tx
    .select({ pending: count() })
    .from(friendRequest)
    .where(eq(friendRequest.senderId, playerId));
  return row?.pending ?? 0;
};

/** The Player's Friends, by Nickname. */
export const readFriends = async (db: Db, playerId: string) =>
  listed(
    await selectListed(db)
      .innerJoin(
        friendship,
        or(
          and(eq(friendship.lowerPlayerId, playerId), eq(friendship.higherPlayerId, user.id)),
          and(eq(friendship.higherPlayerId, playerId), eq(friendship.lowerPlayerId, user.id)),
        ),
      )
      .where(isListable)
      .orderBy(asc(sql`lower(${user.nickname})`)),
  );

export type SendFriendRequestResult =
  | "sent"
  | "becameFriends"
  | "self"
  | "playerNotFound"
  | "alreadyFriends"
  | "requestPending"
  | "friendLimit"
  | "pendingLimit";

/**
 * Sends the Player's Friend request to another Player, at `at`. When that Player had already sent
 * one, the two become Friends at once instead ("becameFriends"). A Player without a Nickname or
 * banned is never found, like one who does not exist. Refused when either Player has `MAX_FRIENDS`,
 * and when the sender already has `MAX_PENDING_SENT_REQUESTS` waiting. The limits are counted per
 * pair under its lock, so that two requests to different Players at the same instant may pass one
 * over by one.
 */
export const sendFriendRequest = async (
  db: Db,
  { senderId, receiverId, at }: { senderId: string; receiverId: string; at: Date },
): Promise<SendFriendRequestResult> => {
  if (senderId === receiverId) return "self";
  return db.transaction(async (tx) => {
    await lockPair(tx, senderId, receiverId);
    const [receiver] = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, receiverId), isListable));
    if (!receiver) return "playerNotFound";
    if (await areFriends(tx, senderId, receiverId)) return "alreadyFriends";
    const pending = await tx
      .select({ senderId: friendRequest.senderId })
      .from(friendRequest)
      .where(requestFrom(senderId, receiverId));
    if (pending.length > 0) return "requestPending";
    if ((await isFull(tx, senderId)) || (await isFull(tx, receiverId))) return "friendLimit";
    const crossed = await tx
      .delete(friendRequest)
      .where(requestFrom(receiverId, senderId))
      .returning({ senderId: friendRequest.senderId });
    if (crossed.length > 0) {
      await befriend(tx, senderId, receiverId, at);
      return "becameFriends";
    }
    if ((await countPendingSent(tx, senderId)) >= MAX_PENDING_SENT_REQUESTS) return "pendingLimit";
    await tx.insert(friendRequest).values({ senderId, receiverId, createdAt: at });
    return "sent";
  });
};

/**
 * The receiver accepts the Friend request the sender sent them, at `at`: "notFound" when no such
 * request waits, "friendLimit" (the request keeps waiting) when either has `MAX_FRIENDS`.
 */
export const acceptFriendRequest = async (
  db: Db,
  { receiverId, senderId, at }: { receiverId: string; senderId: string; at: Date },
): Promise<"accepted" | "notFound" | "friendLimit"> =>
  db.transaction(async (tx) => {
    await lockPair(tx, receiverId, senderId);
    const pending = await tx
      .select({ senderId: friendRequest.senderId })
      .from(friendRequest)
      .where(requestFrom(senderId, receiverId));
    if (pending.length === 0) return "notFound";
    if ((await isFull(tx, senderId)) || (await isFull(tx, receiverId))) return "friendLimit";
    await tx.delete(friendRequest).where(requestFrom(senderId, receiverId));
    await befriend(tx, senderId, receiverId, at);
    return "accepted";
  });

/**
 * Deletes the Friend request from the sender to the receiver, whether the receiver declines it or
 * the sender cancels it; neither is told to the other. False when no such request waits.
 */
export const deleteFriendRequest = async (
  db: Db,
  { senderId, receiverId }: { senderId: string; receiverId: string },
) =>
  (
    await db
      .delete(friendRequest)
      .where(requestFrom(senderId, receiverId))
      .returning({ senderId: friendRequest.senderId })
  ).length > 0;

/** Ends the Friendship of the two Players, for both, silently. False when they were not Friends. */
export const removeFriend = async (db: Db, playerId: string, friendId: string) =>
  (
    await db
      .delete(friendship)
      .where(friendshipOf(playerId, friendId))
      .returning({ lower: friendship.lowerPlayerId })
  ).length > 0;

/** How many Players a Nickname search gives at most. */
export const MAX_SEARCH_RESULTS = 10;

// The Nickname's own underscore must not stand for any one character, nor a backslash escape.
const escapeLike = (text: string) => text.replaceAll(/[\\%_]/g, (character) => `\\${character}`);

/**
 * The Players whose Nickname starts with `prefix`, whatever its case, by Nickname, leaving out the
 * requester and the Players who cannot appear publicly. Exported so that a test can read the plan of
 * this very query.
 */
export const searchablePlayers = (db: Db, playerId: string, prefix: string) =>
  selectListed(db)
    .where(
      and(
        // Written as the index on lower(nickname) holds Nicknames, so that it serves the prefix.
        sql`lower(${user.nickname}) like ${`${escapeLike(prefix.toLowerCase())}%`}`,
        ne(user.id, playerId),
        isListable,
      ),
    )
    .orderBy(asc(sql`lower(${user.nickname})`))
    .limit(MAX_SEARCH_RESULTS);

export type Relation = "friend" | "requestSent" | "requestReceived" | "none";

/** The Player's relation to each of the other Players, `none` for those they have no link with. */
export const readRelations = async (
  db: Db,
  playerId: string,
  otherIds: readonly string[],
): Promise<Map<string, Relation>> => {
  const relations = new Map<string, Relation>(otherIds.map((id) => [id, "none"]));
  if (otherIds.length === 0) return relations;
  const ids = [...otherIds];
  const [friends, sent, received] = await Promise.all([
    db
      .select({ lower: friendship.lowerPlayerId, higher: friendship.higherPlayerId })
      .from(friendship)
      .where(
        or(
          and(eq(friendship.lowerPlayerId, playerId), inArray(friendship.higherPlayerId, ids)),
          and(eq(friendship.higherPlayerId, playerId), inArray(friendship.lowerPlayerId, ids)),
        ),
      ),
    db
      .select({ id: friendRequest.receiverId })
      .from(friendRequest)
      .where(and(eq(friendRequest.senderId, playerId), inArray(friendRequest.receiverId, ids))),
    db
      .select({ id: friendRequest.senderId })
      .from(friendRequest)
      .where(and(eq(friendRequest.receiverId, playerId), inArray(friendRequest.senderId, ids))),
  ]);
  for (const { id } of received) relations.set(id, "requestReceived");
  for (const { id } of sent) relations.set(id, "requestSent");
  for (const { lower, higher } of friends)
    relations.set(lower === playerId ? higher : lower, "friend");
  return relations;
};

/**
 * The Players the Nicknames name, whatever their case, each with its relation to the requester, in the
 * order asked. The requester and a Player who may not appear publicly are left out, like a Nickname
 * nobody holds.
 */
export const readRelationsByNickname = async (
  db: Db,
  playerId: string,
  nicknames: readonly string[],
) => {
  const lowered = nicknames.map((nickname) => nickname.toLowerCase());
  const players = await db
    .select({ id: user.id, nickname: user.nickname })
    .from(user)
    .where(and(inArray(sql`lower(${user.nickname})`, lowered), ne(user.id, playerId), isListable));
  const relations = await readRelations(
    db,
    playerId,
    players.map(({ id }) => id),
  );
  return lowered.flatMap((wanted) =>
    players.flatMap(({ id, nickname }) =>
      nickname?.toLowerCase() === wanted
        ? [{ id, nickname, relation: relations.get(id) ?? "none" }]
        : [],
    ),
  );
};

/** The Players a Nickname prefix finds for the requester, each with its relation to them. */
export const searchPlayers = async (db: Db, playerId: string, prefix: string) => {
  const players = listed(await searchablePlayers(db, playerId, prefix));
  const relations = await readRelations(
    db,
    playerId,
    players.map(({ id }) => id),
  );
  return players.map((player) => ({ ...player, relation: relations.get(player.id) ?? "none" }));
};
