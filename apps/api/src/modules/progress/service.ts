import { wornOrnament } from "@repo/ranked-engine";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { duel, duelGame, duelParticipant, standing, user } from "../../db/schema.ts";
import { readPeakTier } from "../ornament/service.ts";
import { rankFromStored } from "../standing/service.ts";

// Matched as the unique index on lower(nickname) holds Nicknames, so that the index serves it.
const nicknameIs = (nickname: string) => sql`lower(${user.nickname}) = lower(${nickname})`;

/**
 * The Player who chose this Nickname, whatever its case, as anyone may see them; `null` when nobody
 * did. A Player without a Nickname never appears publicly, so is never found.
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
    .where(nicknameIs(nickname));
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

// The Duels a Progress covers, the most recent ones.
const PROGRESS_DUELS = 20;

// Read from the Result inside the database, so that its histories and key timings never leave it.
// The driver saves a jsonb value as a JSON string holding the document: `#>> '{}'` unwraps it (and
// leaves a document stored as such unchanged) before its measure is read.
const measure = (name: "wpm" | "rawWpm" | "accuracy" | "consistency") =>
  sql<number>`((${duelGame.result} #>> '{}')::jsonb ->> ${name})::float8`.mapWith(Number);

/**
 * The Games of the last Duels of the Player who chose this Nickname, whatever its case, oldest
 * first; `null` when nobody did. Only the measures of each Game: never its journal, nor any MMR.
 */
export const readProgress = async (db: Db, nickname: string) => {
  const [player] = await db.select({ id: user.id }).from(user).where(nicknameIs(nickname));
  if (!player) return null;
  const lastDuels = db
    .select({
      duelId: duelParticipant.duelId,
      seat: duelParticipant.seat,
      endedAt: duel.endedAt,
      kind: duel.kind,
    })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .where(eq(duelParticipant.playerId, player.id))
    .orderBy(desc(duel.endedAt), desc(duel.id))
    .limit(PROGRESS_DUELS)
    .as("last_duels");
  const games = await db
    .select({
      endedAt: lastDuels.endedAt,
      kind: lastDuels.kind,
      wpm: measure("wpm"),
      rawWpm: measure("rawWpm"),
      accuracy: measure("accuracy"),
      consistency: measure("consistency"),
    })
    .from(lastDuels)
    .innerJoin(
      duelGame,
      and(eq(duelGame.duelId, lastDuels.duelId), eq(duelGame.seat, lastDuels.seat)),
    )
    .orderBy(asc(lastDuels.endedAt), asc(lastDuels.duelId), asc(duelGame.round));
  return { games: games.map((game) => ({ ...game, endedAt: game.endedAt.getTime() })) };
};
