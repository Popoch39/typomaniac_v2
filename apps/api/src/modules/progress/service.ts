import { wornOrnament } from "@repo/ranked-engine";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import type { UnwrapSchema } from "elysia";
import type { Db } from "../../db/client.ts";
import { duel, duelGame, duelParticipant, standing, user } from "../../db/schema.ts";
import { readPeakTier } from "../ornament/service.ts";
import { rankFromStored } from "../standing/service.ts";
import type * as ProgressModel from "./model.ts";

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

// The Duels the `20-duels` window covers, the most recent ones.
const WINDOW_DUELS = 20;

const WINDOW_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ProgressFilter = Required<UnwrapSchema<typeof ProgressModel.NicknameProgressGet.Query>>;

// Read from the Result inside the database, so that its histories and key timings never leave it.
// The driver saves a jsonb value as a JSON string holding the document: `#>> '{}'` unwraps it (and
// leaves a document stored as such unchanged) before its measure is read.
const measure = (name: "wpm" | "rawWpm" | "accuracy" | "consistency") =>
  sql<number>`((${duelGame.result} #>> '{}')::jsonb ->> ${name})::float8`.mapWith(Number);

/**
 * The Games of the Duels of the Player who chose this Nickname, whatever its case, that the window
 * and the kind select, oldest first, with how many of those Duels they won, lost and drew; `null`
 * when nobody did. Only the measures of each Game: never its journal, nor any MMR.
 */
export const readProgress = async (db: Db, nickname: string, { window, kind }: ProgressFilter) => {
  const [player] = await db.select({ id: user.id }).from(user).where(nicknameIs(nickname));
  if (!player) return null;
  const filteredDuels = db
    .select({
      duelId: duelParticipant.duelId,
      seat: duelParticipant.seat,
      outcome: duelParticipant.outcome,
      endedAt: duel.endedAt,
      kind: duel.kind,
    })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .where(
      and(
        eq(duelParticipant.playerId, player.id),
        kind === "all" ? undefined : eq(duel.kind, kind),
        // By the Duel's end: a Duel begun before the 30 days and ended within them is in.
        window === "30-days" ? gte(duel.endedAt, new Date(Date.now() - WINDOW_DAYS_MS)) : undefined,
      ),
    )
    .orderBy(desc(duel.endedAt), desc(duel.id))
    .$dynamic();
  const selectedDuels = (
    window === "20-duels" ? filteredDuels.limit(WINDOW_DUELS) : filteredDuels
  ).as("selected_duels");
  const countOf = (outcome: "win" | "loss" | "draw") =>
    sql<number>`count(*) filter (where ${selectedDuels.outcome} = ${outcome})`.mapWith(Number);
  const gamesRead = db
    .select({
      endedAt: selectedDuels.endedAt,
      kind: selectedDuels.kind,
      wpm: measure("wpm"),
      rawWpm: measure("rawWpm"),
      accuracy: measure("accuracy"),
      consistency: measure("consistency"),
    })
    .from(selectedDuels)
    .innerJoin(
      duelGame,
      and(eq(duelGame.duelId, selectedDuels.duelId), eq(duelGame.seat, selectedDuels.seat)),
    )
    .orderBy(asc(selectedDuels.endedAt), asc(selectedDuels.duelId), asc(duelGame.round));
  // Counted by the Duel's Outcome, once per Duel: a Duel won 2-1 is one win, not two.
  const summaryRead = db
    .select({ won: countOf("win"), lost: countOf("loss"), drawn: countOf("draw") })
    .from(selectedDuels);
  const [games, [summary]] = await Promise.all([gamesRead, summaryRead]);
  return {
    games: games.map((game) => ({ ...game, endedAt: game.endedAt.getTime() })),
    summary: summary ?? { won: 0, lost: 0, drawn: 0 },
  };
};
