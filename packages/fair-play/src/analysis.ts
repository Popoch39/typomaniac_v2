import {
  type Db,
  duel,
  duelGame,
  duelParticipant,
  duelRound,
  gameAnalysis,
  report,
  review,
  suspicion,
  type Transaction,
  user,
} from "@repo/db";
import {
  playerSuspicion,
  type RankedDuel,
  readDuelSignals,
  readGameSignals,
  SIGNALS_VERSION,
  SUSPICION_DUELS,
  SUSPICION_GAMES,
} from "@repo/fair-play-engine";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, lte, ne, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// A ranked Game of a Player, saved by `at`, that no analysis of the current signals has read yet:
// never analysed, or analysed by an older version of the signals.
const pendingGames = (at: Date) =>
  and(
    eq(duel.kind, "ranked"),
    lte(duel.endedAt, at),
    or(isNull(gameAnalysis.duelId), lt(gameAnalysis.signalsVersion, SIGNALS_VERSION)),
  );

// The joins from a saved Game to its Duel, its seat's Player and its analysis, if any.
const gameOfDuel = eq(duel.id, duelGame.duelId);
const seatOfGame = and(
  eq(duelParticipant.duelId, duelGame.duelId),
  eq(duelParticipant.seat, duelGame.seat),
);
const analysisOfGame = and(
  eq(gameAnalysis.duelId, duelGame.duelId),
  eq(gameAnalysis.round, duelGame.round),
  eq(gameAnalysis.seat, duelGame.seat),
);

// A Report made by `at` that the Suspicion of the Player it is against has not read yet: made after
// it was last computed, or before it ever was.
const unreadReports = (at: Date, ofPlayer?: SQL) =>
  and(
    lte(report.reportedAt, at),
    or(isNull(suspicion.computedAt), gt(report.reportedAt, suspicion.computedAt)),
    ofPlayer,
  );

/**
 * Reads the signals of every saved ranked Game not read yet by the current signals, then updates the
 * Suspicion of each Player who played one, or who was reported since it was last computed, one Player
 * per transaction. A Game already read by the current signals is never read again, nor a Report
 * already counted, so a second pass changes nothing.
 */
export const analyseGames = async (db: Db, at: Date) => {
  const players = await db
    .select({ playerId: duelParticipant.playerId })
    .from(duelGame)
    .innerJoin(duel, gameOfDuel)
    .innerJoin(duelParticipant, seatOfGame)
    .leftJoin(gameAnalysis, analysisOfGame)
    .where(pendingGames(at))
    .groupBy(duelParticipant.playerId);
  // A Report raises the reported Player's Suspicion at the next pass, even when every Game of theirs
  // was read before it was made.
  const reported = await db
    .selectDistinct({ playerId: report.reportedId })
    .from(report)
    .leftJoin(suspicion, eq(suspicion.playerId, report.reportedId))
    .where(unreadReports(at));
  const playerIds = new Set([
    ...players.flatMap(({ playerId }) => (playerId === null ? [] : [playerId])),
    ...reported.map(({ playerId }) => playerId),
  ]);
  for (const playerId of playerIds) await db.transaction((tx) => analysePlayer(tx, playerId, at));
};

const analysePlayer = async (tx: Transaction, playerId: string, at: Date) => {
  // Locked first, so that two passes analysing one Player wait on each other and the second finds
  // nothing left to read.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, playerId)).for("update");
  const games = await tx
    .select({
      duelId: duelGame.duelId,
      round: duelGame.round,
      seat: duelGame.seat,
      journal: duelGame.journal,
      hints: duelGame.hints,
      config: duel.config,
      targetWords: duelRound.words,
    })
    .from(duelGame)
    .innerJoin(duel, gameOfDuel)
    .innerJoin(duelParticipant, seatOfGame)
    .leftJoin(gameAnalysis, analysisOfGame)
    .innerJoin(
      duelRound,
      and(eq(duelRound.duelId, duelGame.duelId), eq(duelRound.round, duelGame.round)),
    )
    .where(and(eq(duelParticipant.playerId, playerId), pendingGames(at)));
  const [unread] = await tx
    .select({ id: report.id })
    .from(report)
    .leftJoin(suspicion, eq(suspicion.playerId, report.reportedId))
    .where(unreadReports(at, eq(report.reportedId, playerId)))
    .limit(1);
  if (games.length === 0 && !unread) return;
  for (const { duelId, round, seat, journal, hints, config, targetWords } of games) {
    const analysis = {
      signalsVersion: SIGNALS_VERSION,
      signals: readGameSignals({ config, targetWords, journal, hints }),
      analysedAt: at,
    };
    await tx
      .insert(gameAnalysis)
      .values({ duelId, round, seat, ...analysis })
      .onConflictDoUpdate({
        target: [gameAnalysis.duelId, gameAnalysis.round, gameAnalysis.seat],
        set: analysis,
      });
  }
  await updateSuspicion(tx, playerId, at);
};

// SUSPICION-1: read from the Player's most recent ranked Games, newest first, as read by the
// current signals.
const updateSuspicion = async (tx: Transaction, playerId: string, at: Date) => {
  const recent = await tx
    .select({ signals: gameAnalysis.signals })
    .from(gameAnalysis)
    .innerJoin(duel, eq(duel.id, gameAnalysis.duelId))
    .innerJoin(
      duelParticipant,
      and(
        eq(duelParticipant.duelId, gameAnalysis.duelId),
        eq(duelParticipant.seat, gameAnalysis.seat),
      ),
    )
    .where(
      and(eq(duelParticipant.playerId, playerId), eq(gameAnalysis.signalsVersion, SIGNALS_VERSION)),
    )
    .orderBy(desc(duel.endedAt), desc(gameAnalysis.round))
    .limit(SUSPICION_GAMES);
  const duelSignals = readDuelSignals(
    await recentDuels(tx, playerId, at, await lastSettledReviewAt(tx, playerId)),
  );
  const computed = {
    value: playerSuspicion(
      recent.map(({ signals }) => signals),
      duelSignals,
    ),
    duelSignals,
    computedAt: at,
  };
  await tx
    .insert(suspicion)
    .values({ playerId, ...computed })
    .onConflictDoUpdate({ target: suspicion.playerId, set: computed });
};

const opponent = alias(duelParticipant, "opponent");

/** When the Player's last settled Review was settled, null when none was. */
export const lastSettledReviewAt = async (tx: Transaction, playerId: string) => {
  const [last] = await tx
    .select({ settledAt: review.settledAt })
    .from(review)
    .where(and(eq(review.playerId, playerId), isNotNull(review.settledAt)))
    .orderBy(desc(review.settledAt))
    .limit(1);
  return last?.settledAt ?? null;
};

/**
 * ACROSS-5: the Player's most recent ranked Duels saved by `at` and started after `since`, their last
 * settled Review, newest first, each with its Opponent, whether that Opponent reported them by `at`
 * (REPORT-1), and the Player's own Games in Round order. The
 * same window as the Games of REVIEW-4, so that no Duel is judged twice either.
 */
export const recentDuels = async (
  tx: Transaction,
  playerId: string,
  at: Date,
  since: Date | null,
): Promise<RankedDuel[]> => {
  const duels = await tx
    .select({
      duelId: duelParticipant.duelId,
      seat: duelParticipant.seat,
      outcome: duelParticipant.outcome,
      opponentId: opponent.playerId,
      reportId: report.id,
    })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .innerJoin(
      opponent,
      and(eq(opponent.duelId, duelParticipant.duelId), ne(opponent.seat, duelParticipant.seat)),
    )
    // One Report at most per Duel and reporting Player: the join never doubles a Duel.
    .leftJoin(
      report,
      and(
        eq(report.duelId, duelParticipant.duelId),
        eq(report.reportedId, playerId),
        eq(report.reporterId, opponent.playerId),
        lte(report.reportedAt, at),
      ),
    )
    .where(
      and(
        eq(duelParticipant.playerId, playerId),
        eq(duel.kind, "ranked"),
        lte(duel.endedAt, at),
        since ? gt(duel.startedAt, since) : undefined,
      ),
    )
    .orderBy(desc(duel.endedAt))
    .limit(SUSPICION_DUELS);
  if (duels.length === 0) return [];
  const games = await tx
    .select({ duelId: duelGame.duelId, seat: duelGame.seat, result: duelGame.result })
    .from(duelGame)
    .where(
      inArray(
        duelGame.duelId,
        duels.map(({ duelId }) => duelId),
      ),
    )
    .orderBy(asc(duelGame.round));
  return duels.map(({ duelId, seat, outcome, opponentId, reportId }) => ({
    opponentId,
    outcome,
    reported: reportId !== null,
    games: games
      .filter((game) => game.duelId === duelId && game.seat === seat)
      .map(({ result }) => result),
  }));
};
