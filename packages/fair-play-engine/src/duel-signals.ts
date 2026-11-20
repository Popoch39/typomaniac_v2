import type { Outcome } from "@repo/duel-engine";
import type { Result } from "@repo/typing-engine";

/** One of a Player's Games in a ranked Duel, as its saved Result gives it. */
export type RankedGame = Pick<Result, "wpm" | "accuracy" | "history">;

/** One of a Player's ranked Duels, seen from them: who they met, its Outcome, and their Games in Round order. */
export type RankedDuel = {
  /** Null for an Opponent whose account no longer exists. */
  readonly opponentId: string | null;
  readonly outcome: Outcome;
  readonly games: readonly RankedGame[];
};

/** The signals read from a Player's recent ranked Duels, by the name a Review shows them under. */
export const DUEL_SIGNAL_NAMES = [
  "levelJump",
  "errorlessSeries",
  "oneSidedPair",
  "lossWithoutTyping",
] as const;

export type DuelSignalName = (typeof DUEL_SIGNAL_NAMES)[number];

/** What each signal across Duels says of a Player, from 0 (like a person) to 1 (not like a person). */
export type DuelSignals = { readonly [name in DuelSignalName]: number };

/** ACROSS-5: how many of a Player's most recent ranked Duels the signals across Duels read. */
export const SUSPICION_DUELS = 20;

// From one ranked Duel to the next, a WPM this many times the last one's starts to say something, and
// this many times reads as another typist. Starting values (ADR 0014), to be tuned on real Games.
const ORDINARY_PROGRESS = 1.5;
const OTHER_TYPIST = 2;
// A series of Games in a row without a single incorrect Keystroke: up to the first length a careful
// person types, from the second one nobody does.
const PERSON_SERIES = 5;
const MACHINE_SERIES = 15;
// Two Players meeting this many times says nothing, and this many times is a pair. The Queue may pair
// the same two Players twice in a row when few are queued (ADR 0014).
const CHANCE_MEETINGS = 2;
const PAIR_MEETINGS = 5;
// The share of their Duels the same one of the two wins: up to the first, the Outcomes are shared; at
// the second, one always wins.
const SHARED_OUTCOMES = 0.6;
const ONE_SIDED = 1;
// Ranked Duels lost without a single Keystroke: one is a Player called away, this many is a Player
// handing their losses to someone.
const CALLED_AWAY = 1;
const HANDED_LOSSES = 3;

/** 1 at or past `full`, 0 at or past `none`, linear between: works in either direction. */
const ramp = (value: number, full: number, none: number) =>
  Math.min(1, Math.max(0, (value - none) / (full - none)));

const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** Whether the Player typed a Keystroke in the Game: a correct one leaves a non-zero Accuracy. */
const typed = (game: RankedGame) => game.accuracy > 0 || incorrectKeystrokes(game) > 0;

const incorrectKeystrokes = ({ history }: RankedGame) =>
  history.errors.reduce((sum, errors) => sum + errors, 0);

/** ACROSS-1: a WPM that jumps from one ranked Duel to the next, as if someone else typed it. */
const levelJump = (oldestFirst: readonly RankedDuel[]) => {
  // A Duel the Player typed nothing in says nothing of their level.
  const levels = oldestFirst
    .map(({ games }) => mean(games.filter(typed).map(({ wpm }) => wpm)))
    .filter((level) => level > 0);
  const jumps = levels.slice(1).map((level, index) => level / (levels[index] ?? level));
  return ramp(Math.max(0, ...jumps), OTHER_TYPIST, ORDINARY_PROGRESS);
};

/** ACROSS-2: a long series of Games in a row without a single incorrect Keystroke. */
const errorlessSeries = (oldestFirst: readonly RankedDuel[]) => {
  let longest = 0;
  let current = 0;
  for (const game of oldestFirst.flatMap(({ games }) => games)) {
    // A Game the Player typed nothing in is not one without mistakes: it ends the series.
    current = typed(game) && incorrectKeystrokes(game) === 0 ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return ramp(longest, MACHINE_SERIES, PERSON_SERIES);
};

/**
 * ACROSS-3: an Opponent the Player keeps meeting, one of the two always winning, as when one account
 * hands its wins to another. Read from the Opponent met in the most one-sided way.
 */
const oneSidedPair = (duels: readonly RankedDuel[]) => {
  const byOpponent = new Map<string, RankedDuel[]>();
  for (const played of duels)
    if (played.opponentId !== null)
      byOpponent.set(played.opponentId, [...(byOpponent.get(played.opponentId) ?? []), played]);
  const pairs = [...byOpponent.values()].map((met) => {
    const wins = met.filter(({ outcome }) => outcome === "win").length;
    const losses = met.filter(({ outcome }) => outcome === "loss").length;
    return (
      ramp(met.length, PAIR_MEETINGS, CHANCE_MEETINGS) *
      ramp(Math.max(wins, losses) / met.length, ONE_SIDED, SHARED_OUTCOMES)
    );
  });
  return Math.max(0, ...pairs);
};

/** ACROSS-4: ranked Duels lost again and again without a single Keystroke, as when a Player hands their losses away. */
const lossWithoutTyping = (duels: readonly RankedDuel[]) => {
  const handed = duels.filter(
    ({ outcome, games }) => outcome === "loss" && !games.some(typed),
  ).length;
  return ramp(handed, HANDED_LOSSES, CALLED_AWAY);
};

/** ACROSS-1 to ACROSS-6: what every signal across Duels says of a Player, given their ranked Duels newest first. */
export const readDuelSignals = (allDuels: readonly RankedDuel[]): DuelSignals => {
  const recentDuels = allDuels.slice(0, SUSPICION_DUELS);
  const oldestFirst = [...recentDuels].reverse();
  return {
    levelJump: levelJump(oldestFirst),
    errorlessSeries: errorlessSeries(oldestFirst),
    oneSidedPair: oneSidedPair(recentDuels),
    lossWithoutTyping: lossWithoutTyping(recentDuels),
  };
};
