import { wornOrnament } from "@repo/ranked-engine";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { standing, user } from "../../db/schema.ts";
import { readPeakTier } from "../ornament/service.ts";
import { rankFromStored } from "../standing/service.ts";

/**
 * The Player who chose this Nickname, whatever its case, as anyone may see them; `null` when nobody
 * did. A Player without a Nickname never appears publicly, so is never found.
 */
export const readPublicPlayer = async (db: Db, nickname: string) => {
  // Matched as the unique index on lower(nickname) holds Nicknames, so that the index serves it.
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
    .where(sql`lower(${user.nickname}) = lower(${nickname})`);
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
