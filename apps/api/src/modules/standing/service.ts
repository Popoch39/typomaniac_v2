import {
  createStanding,
  DEFAULT_RANKED_CONFIG,
  ladderIndex,
  rankAtLadderIndex,
  type Standing,
} from "@repo/ranked-engine";
import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { standing as standingTable } from "../../db/schema.ts";

/** The Player's Standing, which is the one of a new Player while no ranked Duel has stored one. */
export const readStanding = async (db: Db, playerId: string): Promise<Standing> => {
  const [row] = await db.select().from(standingTable).where(eq(standingTable.playerId, playerId));
  if (!row) return createStanding();
  const { mmr, duelsPlayed } = row;
  const rank =
    row.ladderIndex === null || row.lp === null ? null : rankAtLadderIndex(row.ladderIndex, row.lp);
  return { mmr, duelsPlayed, rank };
};

/** Stores the Player's Standing, in place of the one they had. */
export const saveStanding = async (db: Db, playerId: string, standing: Standing): Promise<void> => {
  const { mmr, duelsPlayed, rank } = standing;
  const stored = {
    mmr,
    duelsPlayed,
    ladderIndex: rank === null ? null : ladderIndex(rank),
    lp: rank === null ? null : rank.lp,
  };
  await db
    .insert(standingTable)
    .values({ playerId, ...stored })
    .onConflictDoUpdate({ target: standingTable.playerId, set: stored });
};

/** What a Player may see of their Standing: their Rank and their Placement progress, never the MMR. */
export const visibleStanding = ({ duelsPlayed, rank }: Standing) => {
  const total = DEFAULT_RANKED_CONFIG.placementDuels;
  return { rank, placement: { played: Math.min(duelsPlayed, total), total } };
};
