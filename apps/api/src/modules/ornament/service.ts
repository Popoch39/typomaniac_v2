import { type Ornament, wornOrnament } from "@repo/ranked-engine";
import { eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { standing, user } from "../../db/schema.ts";
import { rankFromStored } from "../standing/service.ts";

/** The Ornament each of these Players wears, from their choice and their current Rank, by Player id. */
export const readWornOrnaments = async (
  db: Db,
  playerIds: readonly string[],
): Promise<Map<string, Ornament>> => {
  if (playerIds.length === 0) return new Map();
  // A Player who never played ranked has no Standing row and is Unranked.
  const rows = await db
    .select({
      playerId: user.id,
      choice: user.ornament,
      ladderIndex: standing.ladderIndex,
      lp: standing.lp,
    })
    .from(user)
    .leftJoin(standing, eq(standing.playerId, user.id))
    .where(inArray(user.id, [...playerIds]));
  return new Map(
    rows.map(({ playerId, choice, ladderIndex, lp }) => [
      playerId,
      wornOrnament(choice, rankFromStored(ladderIndex, lp)),
    ]),
  );
};
