import {
  applyDuel,
  createStanding,
  DEFAULT_RANKED_CONFIG,
  type DuelUpdate,
  ladderIndex,
  type OrnamentChoice,
  type Outcome,
  type Rank,
  rankAtLadderIndex,
  type Standing,
  wornOrnament,
} from "@repo/ranked-engine";
import { and, asc, count, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import type { Db, Transaction } from "../../db/client.ts";
import { duelParticipant, standing as standingTable, user } from "../../db/schema.ts";

/** A Rank as it is stored: the ladder index of its Division and its LP, both `null` while Unranked. */
export const storedRank = (rank: Rank | null) => ({
  ladderIndex: rank === null ? null : ladderIndex(rank),
  lp: rank === null ? null : rank.lp,
});

/** The Rank a stored ladder index and LP stand for. */
export const rankFromStored = (index: number | null, lp: number | null) =>
  index === null || lp === null ? null : rankAtLadderIndex(index, lp);

const storedStanding = ({ mmr, duelsPlayed, rank }: Standing) => ({
  mmr,
  duelsPlayed,
  ...storedRank(rank),
});

const standingFromStored = (row: typeof standingTable.$inferSelect): Standing => ({
  mmr: row.mmr,
  duelsPlayed: row.duelsPlayed,
  rank: rankFromStored(row.ladderIndex, row.lp),
});

/** The Player's Standing, which is the one of a new Player while no ranked Duel has stored one. */
export const readStanding = async (db: Db, playerId: string): Promise<Standing> => {
  const [row] = await db.select().from(standingTable).where(eq(standingTable.playerId, playerId));
  return row ? standingFromStored(row) : createStanding();
};

/** Stores the Player's Standing, in place of the one they had. */
export const saveStanding = async (db: Db, playerId: string, standing: Standing): Promise<void> => {
  const stored = storedStanding(standing);
  await db
    .insert(standingTable)
    .values({ playerId, ...stored })
    .onConflictDoUpdate({ target: standingTable.playerId, set: stored });
};

/** What a ranked Duel did to a Player's Standing: the one they had, and the ranked engine's update. */
export type StandingMove = { readonly before: Standing; readonly update: DuelUpdate };

// Gives a new Player their row first, so that there is always one to lock.
const lockStanding = async (tx: Transaction, playerId: string) => {
  await tx
    .insert(standingTable)
    .values({ playerId, ...storedStanding(createStanding()) })
    .onConflictDoNothing();
  const [row] = await tx
    .select()
    .from(standingTable)
    .where(eq(standingTable.playerId, playerId))
    .for("update");
  if (!row) throw new Error(`Player ${playerId} has no Standing to lock`);
  return standingFromStored(row);
};

/**
 * Moves the Standings of the two Players of a ranked Duel by its Outcomes, inside the transaction
 * that saves it. Both rows are locked before either is read, each Player is then updated against
 * the Opponent's MMR as it was before the Duel, and both are written. Gives each Player's move, in
 * the order of `playerIds`.
 */
export const moveStandings = async (
  tx: Transaction,
  playerIds: readonly [string, string],
  outcomes: readonly [Outcome, Outcome],
): Promise<[StandingMove, StandingMove]> => {
  const before = new Map<string, Standing>();
  // In one order whatever the seats, so that two Duels sharing Players never wait on each other.
  for (const playerId of playerIds.toSorted())
    before.set(playerId, await lockStanding(tx, playerId));
  const move = async (playerId: string, opponentId: string, outcome: Outcome) => {
    const own = before.get(playerId);
    const opponent = before.get(opponentId);
    if (!own || !opponent) throw new Error("A ranked Duel has two Players");
    const update = applyDuel(own, opponent.mmr, outcome);
    await tx
      .update(standingTable)
      .set(storedStanding(update.standing))
      .where(eq(standingTable.playerId, playerId));
    return { before: own, update };
  };
  return [
    await move(playerIds[0], playerIds[1], outcomes[0]),
    await move(playerIds[1], playerIds[0], outcomes[1]),
  ];
};

/** What a Player may see of their Standing: their Rank and their Placement progress, never the MMR. */
export const visibleStanding = ({ duelsPlayed, rank }: Pick<Standing, "duelsPlayed" | "rank">) => {
  const total = DEFAULT_RANKED_CONFIG.placementDuels;
  return { rank, placement: { played: Math.min(duelsPlayed, total), total } };
};

/**
 * What a Player may see of their own Standing: `visibleStanding`, with the Outcome of each Placement
 * Duel they played, in the order they played them.
 */
export const readOwnStanding = async (db: Db, playerId: string) => {
  const { rank, placement } = visibleStanding(await readStanding(db, playerId));
  // Only ranked Duels store the Standing before them, so a Custom Duel never counts.
  const placementDuels = await db
    .select({ outcome: duelParticipant.outcome })
    .from(duelParticipant)
    .where(
      and(
        eq(duelParticipant.playerId, playerId),
        lt(duelParticipant.duelsPlayedBefore, placement.total),
      ),
    )
    .orderBy(asc(duelParticipant.duelsPlayedBefore));
  return { rank, placement: { ...placement, outcomes: placementDuels.map((d) => d.outcome) } };
};

/** How many Positions the Podium holds, above the first page. */
export const PODIUM_SIZE = 3;

/** How many ranked Players a page of the Leaderboard lists, from the first Position after the Podium. */
export const LEADERBOARD_PAGE_SIZE = 15;

const isRanked = isNotNull(standingTable.ladderIndex);

// Rank first (its ladder index, then its LP), the MMR at equal Rank, and the Player's id last so that
// equal Standings keep one order. The index `standing_leaderboard_idx` follows it column for column.
const leaderboardOrder = [
  desc(standingTable.ladderIndex),
  desc(standingTable.lp),
  desc(standingTable.mmr),
  asc(standingTable.playerId),
];

const leaderboardColumns = {
  playerId: standingTable.playerId,
  nickname: user.nickname,
  avatarUrl: user.image,
  ladderIndex: standingTable.ladderIndex,
  lp: standingTable.lp,
  mmr: standingTable.mmr,
  ornament: user.ornament,
};

type LeaderboardRow = {
  playerId: string;
  nickname: string | null;
  avatarUrl: string | null;
  ladderIndex: number | null;
  lp: number | null;
  mmr: number;
  ornament: OrnamentChoice;
};

/**
 * The ranked Players after the first `offset` ones, at most `limit` of them, in the Leaderboard's
 * order. Exported so that a test can read the plan of this very query.
 */
export const leaderboardSlice = (db: Db, offset: number, limit: number) =>
  db
    .select(leaderboardColumns)
    .from(standingTable)
    .innerJoin(user, eq(user.id, standingTable.playerId))
    .where(isRanked)
    .orderBy(...leaderboardOrder)
    .offset(offset)
    .limit(limit);

const countRanked = async (db: Db) => {
  const [row] = await db.select({ total: count() }).from(standingTable).where(isRanked);
  return row?.total ?? 0;
};

// The ranked Players ahead of this one in the Leaderboard's order.
const countAhead = async (db: Db, { playerId, ladderIndex, lp, mmr }: LeaderboardRow) => {
  const own = sql`(${ladderIndex}::smallint, ${lp}::integer, ${mmr}::integer)`;
  const columns = sql`(${standingTable.ladderIndex}, ${standingTable.lp}, ${standingTable.mmr})`;
  const [row] = await db
    .select({ ahead: count() })
    .from(standingTable)
    .where(
      and(
        isRanked,
        sql`(${columns} > ${own} or (${columns} = ${own} and ${standingTable.playerId} < ${playerId}))`,
      ),
    );
  return row?.ahead ?? 0;
};

const leaderboardPlayer = (
  position: number,
  { nickname, avatarUrl, ladderIndex, lp, ornament }: LeaderboardRow,
) => {
  const rank = rankFromStored(ladderIndex, lp);
  if (rank === null) throw new Error("An Unranked Player has no place on the Leaderboard");
  return { position, nickname, avatarUrl, rank, ornament: wornOrnament(ornament, rank) };
};

// The signed-in Player's own place, found among the rows already read before it is looked up.
const readOwn = async (
  db: Db,
  playerId: string,
  read: { position: number; row: LeaderboardRow }[],
) => {
  const known = read.find(({ row }) => row.playerId === playerId);
  if (known) return leaderboardPlayer(known.position, known.row);
  const [row] = await db
    .select(leaderboardColumns)
    .from(standingTable)
    .innerJoin(user, eq(user.id, standingTable.playerId))
    .where(and(isRanked, eq(standingTable.playerId, playerId)));
  return row ? leaderboardPlayer((await countAhead(db, row)) + 1, row) : null;
};

/**
 * The Podium, one page of the ranked Players after it and, for a signed-in ranked Player, their own
 * place, wherever it is. A page past the last one is served as the last page; with no more ranked
 * Players than the Podium holds there is one page, and it is empty. A Guest (`playerId` null) and an
 * Unranked Player have no place of their own.
 */
export const readLeaderboard = async (db: Db, playerId: string | null, requestedPage: number) => {
  const total = await countRanked(db);
  const pageCount = Math.max(1, Math.ceil((total - PODIUM_SIZE) / LEADERBOARD_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const pageStart = PODIUM_SIZE + (page - 1) * LEADERBOARD_PAGE_SIZE;
  const [podiumRows, pageRows] = await Promise.all([
    leaderboardSlice(db, 0, PODIUM_SIZE),
    leaderboardSlice(db, pageStart, LEADERBOARD_PAGE_SIZE),
  ]);
  const read = [
    ...podiumRows.map((row, index) => ({ position: index + 1, row })),
    ...pageRows.map((row, index) => ({ position: pageStart + index + 1, row })),
  ];
  const listed = (rows: typeof read) =>
    rows.map(({ position, row }) => leaderboardPlayer(position, row));
  return {
    podium: listed(read.slice(0, podiumRows.length)),
    players: listed(read.slice(podiumRows.length)),
    page,
    pageCount,
    total,
    own: playerId === null ? null : await readOwn(db, playerId, read),
  };
};
