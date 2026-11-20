import {
  type Db,
  duel,
  duelGame,
  duelParticipant,
  duelRound,
  gameAnalysis,
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
import { and, asc, desc, eq, inArray, isNull, lt, lte, ne, or } from "drizzle-orm";
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

/**
 * Reads the signals of every saved ranked Game not read yet by the current signals, then updates the
 * Suspicion of each Player who played one, one Player per transaction. A Game already read by the
 * current signals is never read again, so a second pass changes nothing.
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
  for (const { playerId } of players)
    if (playerId !== null) await db.transaction((tx) => analysePlayer(tx, playerId, at));
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
  if (games.length === 0) return;
  for (const { duelId, round, seat, journal, config, targetWords } of games) {
    const analysis = {
      signalsVersion: SIGNALS_VERSION,
      signals: readGameSignals({ config, targetWords, journal }),
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
  const duelSignals = readDuelSignals(await recentDuels(tx, playerId, at));
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

// ACROSS-5: the Player's most recent ranked Duels saved by `at`, newest first, each with its Opponent
// and the Player's own Games in Round order.
const recentDuels = async (tx: Transaction, playerId: string, at: Date): Promise<RankedDuel[]> => {
  const duels = await tx
    .select({
      duelId: duelParticipant.duelId,
      seat: duelParticipant.seat,
      outcome: duelParticipant.outcome,
      opponentId: opponent.playerId,
    })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .innerJoin(
      opponent,
      and(eq(opponent.duelId, duelParticipant.duelId), ne(opponent.seat, duelParticipant.seat)),
    )
    .where(
      and(eq(duelParticipant.playerId, playerId), eq(duel.kind, "ranked"), lte(duel.endedAt, at)),
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
  return duels.map(({ duelId, seat, outcome, opponentId }) => ({
    opponentId,
    outcome,
    games: games
      .filter((game) => game.duelId === duelId && game.seat === seat)
      .map(({ result }) => result),
  }));
};
