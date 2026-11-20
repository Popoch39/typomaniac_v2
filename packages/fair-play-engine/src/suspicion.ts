import { DUEL_SIGNAL_NAMES, type DuelSignals } from "./duel-signals.ts";
import { type GameSignals, SIGNAL_NAMES } from "./signals.ts";

// Starting values (ADR 0014), to be tuned on real Games.
/** SUSPICION-1: how many of a Player's most recent ranked Games their Suspicion is read from. */
export const SUSPICION_GAMES = 20;

/**
 * SUSPICION-2 and SUSPICION-4: the share of a Player's Suspicion each signal weighs, adding up to 1.
 * Speed weighs the least: a fast honest typist must never be brought to a Review by speed alone.
 */
export const SIGNAL_WEIGHTS: GameSignals & DuelSignals = {
  keyPressEvenness: 0.2,
  holdEvenness: 0.15,
  missingRollover: 0.15,
  flatWordSpeed: 0.15,
  superhumanSpeed: 0.05,
  levelJump: 0.05,
  errorlessSeries: 0.05,
  oneSidedPair: 0.12,
  lossWithoutTyping: 0.08,
};

const gameSuspicion = (signals: GameSignals) =>
  SIGNAL_NAMES.reduce((sum, signal) => sum + SIGNAL_WEIGHTS[signal] * signals[signal], 0);

/**
 * SUSPICION-1 to SUSPICION-4: a Player's Suspicion, from 0 to 1, given the signals of their ranked
 * Games newest first and the signals read across their recent ranked Duels. The Games weigh as their
 * mean over a full window, a missing Game counting as an ordinary one, so that neither one unusual
 * Game nor a few Games can make it high.
 */
export const playerSuspicion = (recentGames: readonly GameSignals[], duelSignals: DuelSignals) =>
  recentGames.slice(0, SUSPICION_GAMES).reduce((sum, signals) => sum + gameSuspicion(signals), 0) /
    SUSPICION_GAMES +
  DUEL_SIGNAL_NAMES.reduce((sum, signal) => sum + SIGNAL_WEIGHTS[signal] * duelSignals[signal], 0);
