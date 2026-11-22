import { wornOrnament } from "@repo/ranked-engine";
import { SQL } from "bun";
import { and, DrizzleQueryError, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { type Db, nicknameUniqueIndex, standing, user } from "../../db/client.ts";
import { readPeakTier } from "../ornament/service.ts";
import { rankFromStored } from "../standing/service.ts";
import { nicknameFormat } from "./model.ts";

const reservedNicknames = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "system",
  "typomaniac",
  "api",
  "me",
  "null",
  "undefined",
  "anonymous",
  "guest",
]);

export const isReservedNickname = (nickname: string) =>
  reservedNicknames.has(nickname.toLowerCase());

const UNIQUE_VIOLATION = "23505";

const isNicknameTaken = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  error.cause instanceof SQL.PostgresError &&
  error.cause.errno === UNIQUE_VIOLATION &&
  error.cause.constraint === nicknameUniqueIndex;

export type SaveNicknameResult = "saved" | "taken";

// No read before the write: the unique index is the only judge, so two Players aiming at the same Nickname cannot both get it.
export const saveNickname = async (
  db: Db,
  playerId: string,
  nickname: string,
): Promise<SaveNicknameResult> => {
  try {
    await db.update(user).set({ nickname }).where(eq(user.id, playerId));
    return "saved";
  } catch (error) {
    if (isNicknameTaken(error)) return "taken";
    throw error;
  }
};

/** The Players who may appear publicly, those who chose a Nickname, by id, with their Nickname and Avatar. */
export const readPublicPlayers = async (db: Db, playerIds: readonly string[]) => {
  const players = await db
    .select({ id: user.id, nickname: user.nickname, avatarUrl: user.image })
    .from(user)
    .where(inArray(user.id, [...playerIds]));
  return new Map(
    players.flatMap(({ id, nickname, avatarUrl }) =>
      nickname === null ? [] : [[id, { nickname, avatarUrl }] as const],
    ),
  );
};

/** Those of the Players who are banned. */
export const readBannedPlayerIds = async (db: Db, playerIds: readonly string[]) => {
  if (playerIds.length === 0) return new Set<string>();
  const banned = await db
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, [...playerIds]), isNotNull(user.bannedAt)));
  return new Set(banned.map(({ id }) => id));
};

// Matched as the unique index on lower(nickname) holds Nicknames, so that the index serves it. A Ban
// closes the whole account: the banned Player leaves the Leaderboard and their public page with it,
// while their Nickname stays taken.
const publicPlayerNamed = (nickname: string) =>
  and(sql`lower(${user.nickname}) = lower(${nickname})`, isNull(user.bannedAt));

/**
 * The id of the Player who chose this Nickname, whatever its case; `null` when nobody did. A Player
 * without a Nickname, or banned, is never found.
 */
export const readPlayerIdByNickname = async (db: Db, nickname: string) => {
  const [player] = await db.select({ id: user.id }).from(user).where(publicPlayerNamed(nickname));
  return player?.id ?? null;
};

/**
 * The Player who chose this Nickname, whatever its case, as anyone may see them; `null` when nobody
 * did. A Player without a Nickname, or banned, never appears publicly, so is never found.
 */
export const readPublicPlayer = async (db: Db, nickname: string) => {
  const [row] = await db
    .select({
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.image,
      choice: user.ornament,
      ladderIndex: standing.ladderIndex,
      lp: standing.lp,
    })
    .from(user)
    // A Player who never played ranked has no Standing row and is Unranked.
    .leftJoin(standing, eq(standing.playerId, user.id))
    .where(publicPlayerNamed(nickname));
  if (!row?.nickname) return null;
  const rank = rankFromStored(row.ladderIndex, row.lp);
  return {
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    ornament: wornOrnament(row.choice, rank),
    rank,
    peakTier: await readPeakTier(db, row.id),
  };
};

const nicknamePattern = new RegExp(nicknameFormat.pattern);
const isAcceptableNickname = (nickname: string) =>
  nickname.length >= nicknameFormat.minLength &&
  nickname.length <= nicknameFormat.maxLength &&
  nicknamePattern.test(nickname) &&
  !isReservedNickname(nickname);

const RANDOM_SUFFIX_ATTEMPTS = 5;

// The username comes as is from GitHub (up to 39 characters) or Discord (dots allowed), so it is
// cut down to the Nickname rules rather than refused; a random suffix makes room for a taken,
// reserved or too short one. Returns null, leaving the Player to choose, when nothing is left of it.
export const assignDefaultNickname = async (
  db: Db,
  playerId: string,
  providerUsername: string,
): Promise<string | null> => {
  const base = providerUsername.replaceAll(/[^A-Za-z0-9_-]/g, "_");
  if (base === "") return null;
  const suffixed = Array.from(
    { length: RANDOM_SUFFIX_ATTEMPTS },
    () =>
      `${base.slice(0, nicknameFormat.maxLength - 5)}-${1000 + Math.floor(Math.random() * 9000)}`,
  );
  for (const candidate of [base.slice(0, nicknameFormat.maxLength), ...suffixed]) {
    if (!isAcceptableNickname(candidate)) continue;
    if ((await saveNickname(db, playerId, candidate)) === "saved") return candidate;
  }
  return null;
};
