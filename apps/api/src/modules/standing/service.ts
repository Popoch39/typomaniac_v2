import {
  applyDuel,
  createStanding,
  DEFAULT_RANKED_CONFIG,
  type DuelUpdate,
  ladderIndex,
  type Outcome,
  type Rank,
  rankAtLadderIndex,
  type Standing,
} from "@repo/ranked-engine";
import { eq } from "drizzle-orm";
import type { Db, Transaction } from "../../db/client.ts";
import { standing as standingTable } from "../../db/schema.ts";

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
