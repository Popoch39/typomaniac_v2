import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { UnwrapSchema } from "elysia";
import { type Db, duel, duelGame, duelParticipant } from "../../db/client.ts";
import { readPlayerIdByNickname } from "../player/service.ts";
import type * as ProgressModel from "./model.ts";

// The Duels the `20-duels` window covers, the most recent ones.
const WINDOW_DUELS = 20;

// The span the `30-days` window covers, back from the moment of the read.
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ProgressFilter = Required<UnwrapSchema<typeof ProgressModel.NicknameProgressGet.Query>>;

// Read from the Result inside the database, so that its histories and key timings never leave it.
// The driver saves a jsonb value as a JSON string holding the document: `#>> '{}'` unwraps it (and
// leaves a document stored as such unchanged) before its measure is read.
const measure = (name: "wpm" | "rawWpm" | "accuracy" | "consistency") =>
  sql<number>`((${duelGame.result} #>> '{}')::jsonb ->> ${name})::float8`.mapWith(Number);

/**
 * The Games of the Duels of the Player who chose this Nickname, whatever its case, that the window
 * and the kind select, oldest first, with how many of those Duels they won, lost and drew, and their
 * Rank after each ranked Duel of the window; `null` when nobody did. Only the measures of each Game:
 * never its journal, nor any MMR.
 */
export const readProgress = async (db: Db, nickname: string, { window, kind }: ProgressFilter) => {
  const playerId = await readPlayerIdByNickname(db, nickname);
  if (playerId === null) return null;
  const [games, summary, rankPoints] = await Promise.all([
    readGames(db, playerId, { window, kind }),
    readSummary(db, playerId, { window, kind }),
    readRankPoints(db, playerId, window),
  ]);
  return { games, summary, rankPoints };
};

// The Duels of the Player the window and the kind select, the most recent first.
const selectDuels = (db: Db, playerId: string, { window, kind }: ProgressFilter) => {
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
        eq(duelParticipant.playerId, playerId),
        kind === "all" ? undefined : eq(duel.kind, kind),
        // By the Duel's end: a Duel begun before the 30 days and ended within them is in.
        window === "30-days" ? gte(duel.endedAt, new Date(Date.now() - THIRTY_DAYS_MS)) : undefined,
      ),
    )
    .orderBy(desc(duel.endedAt), desc(duel.id))
    .$dynamic();
  return (window === "20-duels" ? filteredDuels.limit(WINDOW_DUELS) : filteredDuels).as(
    "selected_duels",
  );
};

const readGames = async (db: Db, playerId: string, filter: ProgressFilter) => {
  const selectedDuels = selectDuels(db, playerId, filter);
  const games = await db
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
  return games.map((game) => ({ ...game, endedAt: game.endedAt.getTime() }));
};

// Counted by the Duel's Outcome, once per Duel: a Duel won 2-1 is one win, not two.
const readSummary = async (db: Db, playerId: string, filter: ProgressFilter) => {
  const selectedDuels = selectDuels(db, playerId, filter);
  const countOf = (outcome: "win" | "loss" | "draw") =>
    sql<number>`count(*) filter (where ${selectedDuels.outcome} = ${outcome})`.mapWith(Number);
  const [summary] = await db
    .select({ won: countOf("win"), lost: countOf("loss"), drawn: countOf("draw") })
    .from(selectedDuels);
  return summary ?? { won: 0, lost: 0, drawn: 0 };
};

// The Rank after each ranked Duel of the window that ended with one: a Placement Duel before the first
// Rank has none, and a Custom Duel never moves it, so the kind chosen does not apply.
const readRankPoints = async (db: Db, playerId: string, window: ProgressFilter["window"]) => {
  const rankedDuels = selectDuels(db, playerId, { window, kind: "ranked" });
  const points = await db
    .select({
      endedAt: rankedDuels.endedAt,
      ladderIndex: duelParticipant.ladderIndexAfter,
      lp: duelParticipant.lpAfter,
      rankChange: duelParticipant.rankChange,
    })
    .from(rankedDuels)
    .innerJoin(
      duelParticipant,
      and(
        eq(duelParticipant.duelId, rankedDuels.duelId),
        eq(duelParticipant.seat, rankedDuels.seat),
      ),
    )
    .where(isNotNull(duelParticipant.ladderIndexAfter))
    .orderBy(asc(rankedDuels.endedAt), asc(rankedDuels.duelId));
  return points.flatMap(({ endedAt, ladderIndex, lp, rankChange }) =>
    // A stored Rank always has its LP and its change, as the Standing saved with the Duel is whole.
    ladderIndex === null || lp === null || rankChange === null
      ? []
      : [{ endedAt: endedAt.getTime(), ladderIndex, lp, rankChange }],
  );
};
