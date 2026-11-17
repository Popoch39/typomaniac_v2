import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult, type Game, type GameEvent } from "../src/index.ts";

function replay(game: Game, events: readonly GameEvent[]): Game {
  return events.reduce(applyEvent, game);
}

function insertions(text: string, from: number, step: number): GameEvent[] {
  return Array.from(text, (char, index) => ({
    type: "insert",
    at: from + index * step,
    text: char,
  }));
}

const DUEL_WORDS = ["cat", "dog"];
const REPLAY_WORDS = ["cat", "dog", "emu"];
const SIGNAL: GameEvent = { type: "start", at: 10_000 };

// A words Game with a mistake corrected, a word validated wrong and a return to it,
// one key released and another one still held at the end.
const WORDS_LOG: readonly GameEvent[] = [
  SIGNAL,
  { type: "tick", at: 11_000 },
  { type: "keyDown", at: 11_190, code: "KeyC" },
  ...insertions("cx", 11_200, 150),
  { type: "keyUp", at: 11_270, code: "KeyC" },
  { type: "keyDown", at: 11_340, code: "KeyX" },
  { type: "delete", at: 11_600, unit: "char" },
  ...insertions("at dx ", 11_800, 150),
  { type: "delete", at: 12_800, unit: "word" },
  { type: "addWords", words: ["fox"] },
  ...insertions("dog emu", 13_000, 150),
];

// A time Game that runs out of words, receives more, and ends on a late Tick.
const TIME_LOG: readonly GameEvent[] = [
  SIGNAL,
  ...insertions("cat dig ", 10_400, 100),
  { type: "delete", at: 11_200, unit: "char" },
  { type: "insert", at: 11_300, text: " " },
  { type: "addWords", words: ["emu", "fox"] },
  { type: "tick", at: 11_500 },
  ...insertions("em", 11_600, 100),
  { type: "tick", at: 12_004 },
  { type: "insert", at: 12_100, text: "u" },
];

test("DUEL-1: two Games on the same words and the same start signal give two independent Results", () => {
  const first = createGame({ mode: "words", wordCount: 2 }, DUEL_WORDS);
  const second = createGame({ mode: "words", wordCount: 2 }, DUEL_WORDS);

  // The first player reacts in 0.5 s and types without a mistake, the second in 1 s with one.
  const firstFinished = replay(first, [SIGNAL, ...insertions("cat dog", 10_500, 250)]);
  const secondFinished = replay(second, [
    SIGNAL,
    ...insertions("cat dxg", 11_000, 500),
    { type: "insert", at: 15_000, text: " " },
  ]);

  expect(getResult(firstFinished)).toEqual({
    duration: 2,
    // 7 characters / 5 / (2 s / 60) = 42
    wpm: 42,
    rawWpm: 42,
    accuracy: 100,
    charCounts: { correct: 7, incorrect: 0, extra: 0, missed: 0, exactWords: 7 },
    // Keystrokes 0.5, 0.75 and 1 s after the signal, then 4 more: rates 36 and 48.
    // Mean 42, deviation 6: c = 1 / 7, 100 × (1 − tanh(0.14384…)) = 85.71.
    consistency: 85.71,
    // "cat" after 1 s: 3 / 5 / (1 / 60) = 36. The 7 characters after 2 s: 42.
    history: { wpm: [36, 42], keystrokeRate: [36, 48], errors: [0, 0] },
    // No key Event was applied, and both buckets hold keystrokes.
    keyPressGaps: [],
    keyHoldDurations: [],
    keyConsistency: 0,
    inactiveSeconds: 0,
    inactiveAtEnd: false,
  });
  expect(getResult(secondFinished)).toEqual({
    duration: 5,
    // Only "cat " is typed exactly: 4 characters / 5 / (5 s / 60) = 9.6
    wpm: 9.6,
    // 7 characters / 5 / (5 s / 60) = 16.8
    rawWpm: 16.8,
    // 6 correct keystrokes out of 8: the wrong letter and the space that ends the Game are incorrect.
    accuracy: 75,
    charCounts: { correct: 6, incorrect: 1, extra: 0, missed: 0, exactWords: 4 },
    // Rates 12, 24, 24, 24, 12: mean 19.2, deviation √34.56 = 5.8788, c = 0.30619,
    // 100 × (1 − tanh(0.31629…)) = 69.38.
    consistency: 69.38,
    history: {
      // Credited characters at each second: 1, 3, 5 ("cat d"), then 4 once "dx" is wrong.
      // 12, 18, 20, 4 / 5 / (4 / 60) = 12 and 4 / 5 / (5 / 60) = 9.6.
      wpm: [12, 18, 20, 12, 10],
      // 1 keystroke on the first boundary, 2 per second after, and the final space alone.
      keystrokeRate: [12, 24, 24, 24, 12],
      // "x" 3.5 s after the signal, the space on the wrong last word at 5 s.
      errors: [0, 0, 0, 1, 1],
    },
    keyPressGaps: [],
    keyHoldDurations: [],
    keyConsistency: 0,
    inactiveSeconds: 0,
    inactiveAtEnd: false,
  });
});

test("DUEL-1: applying Events to one Game never changes another Game created from the same word list", () => {
  const first = createGame({ mode: "time", seconds: 2 }, DUEL_WORDS);
  const second = createGame({ mode: "time", seconds: 2 }, DUEL_WORDS);
  const untouched = structuredClone(second);

  const firstFinished = replay(first, TIME_LOG);

  expect(firstFinished.status).toBe("finished");
  expect(second).toEqual(untouched);
  expect(DUEL_WORDS).toEqual(["cat", "dog"]);
});

test("DUEL-1: one Game started on a signal and shared by two players forks into two independent Games", () => {
  const started = applyEvent(createGame({ mode: "words", wordCount: 2 }, DUEL_WORDS), SIGNAL);

  const first = replay(started, insertions("cat", 10_500, 100));
  const second = replay(started, insertions("do", 10_600, 100));

  expect(first.inputs).toEqual(["cat", ""]);
  expect(second.inputs).toEqual(["do", ""]);
  expect(first.keystrokes).toHaveLength(3);
  expect(second.keystrokes).toHaveLength(2);
  expect(started.keystrokes).toEqual([]);
});

test("REPLAY-1: replaying the same Events of a words Game gives the same Result and the same keystroke log", () => {
  const once = replay(createGame({ mode: "words", wordCount: 3 }, REPLAY_WORDS), WORDS_LOG);
  const twice = replay(createGame({ mode: "words", wordCount: 3 }, REPLAY_WORDS), WORDS_LOG);

  expect(once.status).toBe("finished");
  expect(twice).toEqual(once);
  expect(twice.keystrokes).toEqual(once.keystrokes);
  expect(getResult(twice)).toEqual(getResult(once));
});

test("REPLAY-1: replaying the same Events of a time Game gives the same Result and the same keystroke log", () => {
  const once = replay(createGame({ mode: "time", seconds: 2 }, DUEL_WORDS), TIME_LOG);
  const twice = replay(createGame({ mode: "time", seconds: 2 }, DUEL_WORDS), TIME_LOG);

  expect(once.status).toBe("finished");
  expect(twice).toEqual(once);
  expect(twice.keystrokes).toEqual(once.keystrokes);
  expect(getResult(twice)).toEqual(getResult(once));
});

test("REPLAY-2: Events passed through JSON and replayed give the same Result and the same keystroke log", () => {
  const wordsLog: GameEvent[] = JSON.parse(JSON.stringify(WORDS_LOG));
  const timeLog: GameEvent[] = JSON.parse(JSON.stringify(TIME_LOG));

  const words = replay(createGame({ mode: "words", wordCount: 3 }, REPLAY_WORDS), wordsLog);
  const time = replay(createGame({ mode: "time", seconds: 2 }, DUEL_WORDS), timeLog);

  const wordsLive = replay(createGame({ mode: "words", wordCount: 3 }, REPLAY_WORDS), WORDS_LOG);
  const timeLive = replay(createGame({ mode: "time", seconds: 2 }, DUEL_WORDS), TIME_LOG);
  expect(wordsLog).toEqual([...WORDS_LOG]);
  expect(words.keystrokes).toEqual(wordsLive.keystrokes);
  expect(getResult(words)).toEqual(getResult(wordsLive));
  expect(time.keystrokes).toEqual(timeLive.keystrokes);
  expect(getResult(time)).toEqual(getResult(timeLive));
});

test("REPLAY-2: a Result passes through JSON unchanged, even without any keystroke", () => {
  const game = createGame({ mode: "time", seconds: 2 }, DUEL_WORDS);
  const result = getResult(replay(game, [SIGNAL, { type: "tick", at: 12_000 }]));

  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
});
