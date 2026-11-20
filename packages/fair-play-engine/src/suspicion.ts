import { type GameSignals, SIGNAL_NAMES } from "./signals.ts";

// Starting values (ADR 0014), to be tuned on real Games.
/** SUSPICION-1: how many of a Player's most recent ranked Games their Suspicion is read from. */
export const SUSPICION_GAMES = 20;

/**
 * SUSPICION-2: the share of a Game's Suspicion each signal weighs, adding up to 1. Speed weighs
 * less than rhythm: a fast honest typist must never be brought to a Review by speed alone.
 */
export const SIGNAL_WEIGHTS: GameSignals = {
  keyPressEvenness: 0.25,
  holdEvenness: 0.2,
  missingRollover: 0.15,
  flatWordSpeed: 0.15,
  superhumanSpeed: 0.1,
  // A hint is as easy to forge as to leave out: it catches the laziest bots, never a careful one.
  browserHints: 0.15,
};

const gameSuspicion = (signals: GameSignals) =>
  SIGNAL_NAMES.reduce((sum, signal) => sum + SIGNAL_WEIGHTS[signal] * signals[signal], 0);

/**
 * SUSPICION-1 to SUSPICION-3: a Player's Suspicion, from 0 to 1, given the signals of their ranked
 * Games newest first. It is the mean over a full window of Games, a missing Game counting as an
 * ordinary one, so that neither one unusual Game nor a few Games can make it high.
 */
export const playerSuspicion = (recentGames: readonly GameSignals[]) =>
  recentGames.slice(0, SUSPICION_GAMES).reduce((sum, signals) => sum + gameSuspicion(signals), 0) /
  SUSPICION_GAMES;
