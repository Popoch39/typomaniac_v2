import { commonWords } from "@repo/duel-engine";
import {
  applyEvent,
  createGame,
  type Game,
  getResult,
  type GameConfig,
  type GameEvent,
  type Keystroke,
} from "@repo/typing-engine";

/** One saved Game, as the signals read it: its journal and the Target words it was typed on. */
export type PlayedGame = {
  readonly config: GameConfig;
  readonly targetWords: readonly string[];
  readonly journal: readonly GameEvent[];
};

/** The signals read from one Game, by the name a Review shows them under (SIGNAL-1 to SIGNAL-5). */
export const SIGNAL_NAMES = [
  "keyPressEvenness",
  "holdEvenness",
  "missingRollover",
  "flatWordSpeed",
  "superhumanSpeed",
] as const;

export type SignalName = (typeof SIGNAL_NAMES)[number];

/** What each signal says of one Game, from 0 (typed like a person) to 1 (not like a person). */
export type GameSignals = { readonly [name in SignalName]: number };

/**
 * SIGNAL-7: the version of the signals, saved with the values they gave. Raised whenever a signal
 * is added or changed, so that the fair-play pass reads every saved Game again with the new ones.
 */
export const SIGNALS_VERSION = 1;

// A longer gap is a pause between bursts, not part of the rhythm being judged.
const PAUSE_MS = 1000;
// Below this many intervals, a Game says too little to be judged and every signal reads 0.
const MIN_SAMPLES = 20;
// Coefficients of variation: at or below the first, the rhythm is a machine's; at or above the
// second, a person's. Starting values (ADR 0014), to be tuned on real Games.
const MACHINE_GAP_VARIATION = 0.1;
const PERSON_GAP_VARIATION = 0.3;
// A person's hold times vary less than their intervals, but a script's do not vary at all.
const MACHINE_HOLD_VARIATION = 0.05;
const PERSON_HOLD_VARIATION = 0.15;
// A median interval at or below this (about 120 WPM) is the high speed at which a person's fingers
// overlap: the next key goes down before the last one is released.
const HIGH_SPEED_GAP_MS = 100;
// The share of KeyPresses overlapping the one before from which a fast Game reads as a person's.
const PERSON_ROLLOVER = 0.2;
// The Target words are drawn from a list ordered from the most frequent word: a word past this rank,
// or out of the list, is rare.
const FREQUENT_RANKS = 100;
// Below this many words typed without a mistake in either group, the comparison says nothing.
const MIN_WORDS = 5;
// How much slower per character a person types rare words than frequent ones, at the least.
const PERSON_RARE_SLOWDOWN = 1.15;
// About the fastest a person has ever typed over a short Game, and well past it: from the first, the
// speed starts to say something, and at the second it is out of human reach. Speed alone sanctions
// nobody, and a fast honest typist stays below the first.
const HUMAN_RECORD_WPM = 300;
const BEYOND_HUMAN_WPM = 400;
const frequentWords = new Set(commonWords.slice(0, FREQUENT_RANKS));

/** 1 at or past `full`, 0 at or past `none`, linear between: works in either direction. */
const ramp = (value: number, full: number, none: number) =>
  Math.min(1, Math.max(0, (value - none) / (full - none)));

const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** The standard deviation over the mean; 0 for values that are all 0. */
const variation = (values: readonly number[]) => {
  const average = mean(values);
  if (average === 0) return 0;
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance) / average;
};

// The milliseconds from each KeyPress to the next, pauses left out.
const keyPressGaps = (game: Game) =>
  game.keyPresses
    .slice(1)
    .map((press, index) => press.at - (game.keyPresses[index]?.at ?? press.at))
    .filter((gap) => gap < PAUSE_MS);

/** SIGNAL-1: intervals between KeyPresses as even as a machine's. */
const keyPressEvenness = (game: Game) => {
  const gaps = keyPressGaps(game);
  if (gaps.length < MIN_SAMPLES) return 0;
  return ramp(variation(gaps), MACHINE_GAP_VARIATION, PERSON_GAP_VARIATION);
};

/** SIGNAL-2: keys all held as long as each other, as a script holds them. */
const holdEvenness = (game: Game) => {
  const holds = game.keyPresses.flatMap(({ at, releasedAt }) =>
    releasedAt === null ? [] : [releasedAt - at],
  );
  if (holds.length < MIN_SAMPLES) return 0;
  return ramp(variation(holds), MACHINE_HOLD_VARIATION, PERSON_HOLD_VARIATION);
};

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** SIGNAL-3: at high speed, every key released before the next one goes down. */
const missingRollover = (game: Game) => {
  const gaps = keyPressGaps(game);
  if (gaps.length < MIN_SAMPLES || median(gaps) > HIGH_SPEED_GAP_MS) return 0;
  const overlapping = game.keyPresses.slice(1).filter((press, index) => {
    const previous = game.keyPresses[index];
    return (
      previous !== undefined && (previous.releasedAt === null || press.at < previous.releasedAt)
    );
  }).length;
  return ramp(overlapping / (game.keyPresses.length - 1), 0, PERSON_ROLLOVER);
};

/**
 * The milliseconds per character of every word typed without a mistake, timed from the last
 * Keystroke of the word before it, which is when its own first character could be typed.
 */
const wordPaces = (game: Game, targetWords: readonly string[]) => {
  const byWord = new Map<number, Keystroke[]>();
  for (const keystroke of game.keystrokes)
    byWord.set(keystroke.wordIndex, [...(byWord.get(keystroke.wordIndex) ?? []), keystroke]);
  return [...byWord].flatMap(([wordIndex, keystrokes]) => {
    const startedAt = byWord.get(wordIndex - 1)?.at(-1)?.at;
    const endedAt = keystrokes.at(-1)?.at;
    // The words as drawn: those of a time Game carry their separator.
    const word = targetWords[wordIndex];
    if (startedAt === undefined || endedAt === undefined || word === undefined) return [];
    if (!keystrokes.every((keystroke) => keystroke.correct)) return [];
    return [{ word, pace: (endedAt - startedAt) / keystrokes.length }];
  });
};

/** SIGNAL-4: rare words typed as fast as frequent ones, which a person never does. */
const flatWordSpeed = (game: Game, targetWords: readonly string[]) => {
  const paces = wordPaces(game, targetWords);
  const frequent = paces.filter(({ word }) => frequentWords.has(word)).map(({ pace }) => pace);
  const rare = paces.filter(({ word }) => !frequentWords.has(word)).map(({ pace }) => pace);
  if (frequent.length < MIN_WORDS || rare.length < MIN_WORDS) return 0;
  return ramp(mean(rare) / mean(frequent), 1, PERSON_RARE_SLOWDOWN);
};

/** SIGNAL-5: a speed beyond what a person has ever typed. */
const superhumanSpeed = (game: Game) =>
  ramp(getResult(game).wpm, BEYOND_HUMAN_WPM, HUMAN_RECORD_WPM);

/** SIGNAL-1 to SIGNAL-5: what every signal says of one Game, replayed from its journal. */
export const readGameSignals = ({ config, targetWords, journal }: PlayedGame): GameSignals => {
  const game = journal.reduce(applyEvent, createGame(config, targetWords));
  return {
    keyPressEvenness: keyPressEvenness(game),
    holdEvenness: holdEvenness(game),
    missingRollover: missingRollover(game),
    flatWordSpeed: flatWordSpeed(game, targetWords),
    superhumanSpeed: superhumanSpeed(game),
  };
};
