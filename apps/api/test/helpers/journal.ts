import { commonWords, DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";

const ROUND_MS = 30_000;

/** Target words that alternate a frequent word with a rare one, from the list the Duel draws from. */
export const targetWords: readonly string[] = Array.from({ length: 250 }, (_, index) =>
  index % 2 === 0 ? (commonWords[index % 40] ?? "the") : (commonWords[150 + (index % 80)] ?? "the"),
);

const rareWords = new Set(commonWords.slice(100));

// Numbers in [0, 1) from a fixed seed, so that a person's variation is the same at every run.
const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

/**
 * The journal of a 30-second Duel Game typed without a mistake, one keyDown, insert and keyUp per
 * character, with `gap` milliseconds before each KeyPress and each key held `hold` milliseconds.
 */
const typeJournal = (gap: (word: string) => number, hold: () => number): GameEvent[] => {
  const chars = targetWords.flatMap((word) => Array.from(`${word} `, (char) => ({ char, word })));
  const events: GameEvent[] = [{ type: "start", at: 0 }];
  let at = 0;
  for (const { char, word } of chars) {
    at += gap(word);
    if (at >= ROUND_MS) break;
    const code = char === " " ? "Space" : `Key${char.toUpperCase()}`;
    events.push(
      { type: "keyDown", at, code },
      { type: "insert", at, text: char },
      { type: "keyUp", at: at + hold(), code },
    );
  }
  events.push({ type: "tick", at: ROUND_MS });
  // In the order of their instants, as the server journals them; the sort is stable.
  return events.sort(
    (first, second) => ("at" in first ? first.at : 0) - ("at" in second ? second.at : 0),
  );
};

/** A script typing every character `gapMs` after the last, each key held half as long. */
export const machineJournal = (gapMs = 60) =>
  typeJournal(
    () => gapMs,
    () => gapMs / 2,
  );

/** A Game in which the Player typed nothing. */
export const idleJournal = (): GameEvent[] => [
  { type: "start", at: 0 },
  { type: "tick", at: ROUND_MS },
];

/**
 * A person typing around 90 ms per character: uneven intervals and hold times, keys often still down
 * when the next one goes down, rare words typed more slowly than frequent ones.
 */
export const personJournal = (seed = 7) => {
  const gapNoise = seeded(seed);
  const holdNoise = seeded(seed + 1);
  return typeJournal(
    (word) => 90 * (0.5 + gapNoise()) * (rareWords.has(word) ? 1.4 : 1),
    () => 90 * (0.8 + 0.8 * holdNoise()),
  );
};

/** The Result the API saves with a journal. */
export const resultOf = (journal: readonly GameEvent[]) =>
  getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, targetWords)));
