import { commonWords } from "@repo/duel-engine";
import type { GameEvent } from "@repo/typing-engine";

/** How a typist moves: the milliseconds before each KeyPress, and how long each key is held. */
export type Typist = {
  readonly gap: (index: number, word: string) => number;
  readonly hold: (index: number, word: string) => number;
};

/** The length of a Duel Round, which every journal here fills. */
export const ROUND_MS = 30_000;

/** Target words that alternate a frequent word with a rare one, from the list the Duel draws from. */
export const targetWords: readonly string[] = Array.from({ length: 250 }, (_, index) =>
  index % 2 === 0 ? (commonWords[index % 40] ?? "the") : (commonWords[150 + (index % 80)] ?? "the"),
);

/** Integers from a fixed seed, so that a person's variation is the same at every run. */
export const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const codeOf = (char: string) => (char === " " ? "Space" : `Key${char.toUpperCase()}`);

/**
 * The journal of a 30-second Duel Game where `typist` types the Target words without a mistake, one
 * keyDown, insert and keyUp per character, until the Round ends.
 */
export const typeJournal = (
  typist: Typist,
  words: readonly string[] = targetWords,
): GameEvent[] => {
  const chars = words.flatMap((word) => Array.from(`${word} `, (char) => ({ char, word })));
  const events: GameEvent[] = [{ type: "start", at: 0 }];
  let at = 0;
  for (const [index, { char, word }] of chars.entries()) {
    at += typist.gap(index, word);
    if (at >= ROUND_MS) break;
    const code = codeOf(char);
    events.push(
      { type: "keyDown", at, code },
      { type: "insert", at, text: char },
      { type: "keyUp", at: at + typist.hold(index, word), code },
    );
  }
  events.push({ type: "tick", at: ROUND_MS });
  // Sorted by instant, as the server journals them: a key released after the next one went down
  // comes after it. The sort is stable, so a keyDown stays before its insert.
  return events.sort(
    (first, second) => ("at" in first ? first.at : 0) - ("at" in second ? second.at : 0),
  );
};

/** A script: every KeyPress `gapMs` after the last one, every key held `holdMs`. */
export const machine = (gapMs: number, holdMs = gapMs / 2): Typist => ({
  gap: () => gapMs,
  hold: () => holdMs,
});

/**
 * A person typing around `gapMs` between KeyPresses: uneven intervals and hold times, keys often
 * still down when the next one goes down, and rare words typed more slowly than frequent ones.
 */
export const person = (gapMs: number, seed = 7): Typist => {
  const gapNoise = seeded(seed);
  const holdNoise = seeded(seed + 1);
  const rare = new Set(commonWords.slice(100));
  return {
    gap: (_, word) => gapMs * (0.5 + gapNoise()) * (rare.has(word) ? 1.4 : 1),
    hold: () => gapMs * (0.8 + 0.8 * holdNoise()),
  };
};
