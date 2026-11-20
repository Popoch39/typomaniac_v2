import { standing as standingTable, type Transaction } from "@repo/db";
import {
  applyCorrection,
  type Correction,
  createStanding,
  DEFAULT_RANKED_CONFIG,
  ladderIndex,
  type Rank,
  rankAtLadderIndex,
  type Standing,
} from "@repo/ranked-engine";
import { eq } from "drizzle-orm";

/** A Rank as it is stored: the ladder index of its Division and its LP, both `null` while Unranked. */
export const storedRank = (rank: Rank | null) => ({
  ladderIndex: rank === null ? null : ladderIndex(rank),
  lp: rank === null ? null : rank.lp,
});

/** The Rank a stored ladder index and LP stand for. */
export const rankFromStored = (index: number | null, lp: number | null) =>
  index === null || lp === null ? null : rankAtLadderIndex(index, lp);

/** A Standing as it is stored in its row. */
export const storedStanding = ({ mmr, duelsPlayed, rank }: Standing) => ({
  mmr,
  duelsPlayed,
  ...storedRank(rank),
});

/** The Standing a stored row stands for. */
export const standingFromStored = (row: typeof standingTable.$inferSelect): Standing => ({
  mmr: row.mmr,
  duelsPlayed: row.duelsPlayed,
  rank: rankFromStored(row.ladderIndex, row.lp),
});

/** Locks the Player's Standing row for the rest of the transaction, giving a new Player theirs first so that there is always one to lock. */
export const lockStanding = async (tx: Transaction, playerId: string) => {
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

// A Rank's place along the whole ladder in LP (CORRECT-1), 0 while Unranked.
const ladderPosition = (rank: Rank | null) =>
  rank === null ? 0 : ladderIndex(rank) * DEFAULT_RANKED_CONFIG.lpPerDivision + rank.lp;

/** What a correction did to a Player's Standing: the MMR and LP actually applied, and the Rank left. */
export type AppliedCorrection = { readonly correction: Correction; readonly standing: Standing };

/**
 * Applies a correction to the Standing of each Player, as it is now, inside the caller's
 * transaction. Rows are locked in one sorted order, as the saving of a ranked Duel does, so a
 * correction never waits on a Duel being saved that waits on it. Gives what was applied to each, in
 * the order given, which can be less than asked at the floors of the MMR and of the ladder.
 */
export const correctStandings = async (
  tx: Transaction,
  corrections: readonly { readonly playerId: string; readonly correction: Correction }[],
): Promise<AppliedCorrection[]> => {
  const before = new Map<string, Standing>();
  for (const playerId of corrections.map((c) => c.playerId).toSorted())
    before.set(playerId, await lockStanding(tx, playerId));
  const applied: AppliedCorrection[] = [];
  for (const { playerId, correction } of corrections) {
    const own = before.get(playerId);
    if (!own) throw new Error(`Player ${playerId} has no Standing to correct`);
    const standing = applyCorrection(own, correction);
    await tx
      .update(standingTable)
      .set(storedStanding(standing))
      .where(eq(standingTable.playerId, playerId));
    applied.push({
      correction: {
        mmr: standing.mmr - own.mmr,
        lp: ladderPosition(standing.rank) - ladderPosition(own.rank),
      },
      standing,
    });
  }
  return applied;
};
