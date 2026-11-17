import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("START-1: without a start Event, the clock of a time Game starts at the first text insertion", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);

  const typing = applyEvent(game, { type: "insert", at: 10_800, text: "c" });

  expect(typing.status).toBe("running");
  expect(typing.startedAt).toBe(10_800);
});

test("START-2: a start Event starts the clock at its instant, before any insertion", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);

  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(started).toEqual({ ...game, status: "running", startedAt: 10_000 });
});

test("START-2: a start Event starts the clock of a time Game too", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);

  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(started).toEqual({ ...game, status: "running", startedAt: 10_000 });
});

test("START-3: the first insertion after a start Event does not restart the clock", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  const typing = applyEvent(started, { type: "insert", at: 10_800, text: "c" });

  expect(typing.startedAt).toBe(10_000);
  expect(typing.inputs).toEqual(["c", ""]);
  expect(typing.keystrokes).toEqual([
    { at: 10_800, wordIndex: 0, charIndex: 0, char: "c", correct: true },
  ]);
});

test("START-3: the time before the first letter counts in the duration and in the WPM", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  // 7 insertions from 10 800 ms to 12 000 ms: 2 s after the start Event, 1.2 s after the first letter.
  const result = getResult(typeText(started, "cat dog", 10_800, 200));

  expect(result.duration).toBe(2);
  // 7 characters / 5 / (2 s / 60) = 42
  expect(result.wpm).toBe(42);
  expect(result.rawWpm).toBe(42);
  expect(result.accuracy).toBe(100);
});

test("START-1: the same Game without a start Event is timed from its first letter", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);

  const result = getResult(typeText(game, "cat dog", 10_800, 200));

  expect(result.duration).toBe(1.2);
  // 7 characters / 5 / (1.2 s / 60) = 70
  expect(result.wpm).toBe(70);
});

test("START-4: the limit of a time Game is counted from the start Event, not from the first letter", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });
  const typing = typeText(started, "cat", 11_500, 100);

  expect(applyEvent(typing, { type: "tick", at: 11_999 })).toEqual(typing);
  expect(applyEvent(typing, { type: "tick", at: 12_000 })).toEqual({
    ...typing,
    status: "finished",
    endedAt: 12_000,
  });
});

test("START-4: the Result of a time Game started on a signal covers the reaction time", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });
  const finished = applyEvent(typeText(started, "cat ", 11_500, 100), { type: "tick", at: 12_000 });

  const result = getResult(finished);

  expect(result.duration).toBe(2);
  // 4 characters / 5 / (2 s / 60) = 24
  expect(result.wpm).toBe(24);
});

test("START-5: a start Event received after the first insertion is ignored", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const typing = typeText(game, "ca", 10_800, 200);

  expect(applyEvent(typing, { type: "start", at: 11_500 })).toEqual(typing);
});

test("START-5: a second start Event is ignored", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(applyEvent(started, { type: "start", at: 10_500 })).toEqual(started);
});

test("START-5: a start Event received after the end of the Game is ignored", () => {
  const words = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const finishedWords = typeText(words, "cat dog", 10_800, 200);
  const time = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  const finishedTime = applyEvent(typeText(time, "cat", 10_000, 100), { type: "tick", at: 12_000 });

  expect(applyEvent(finishedWords, { type: "start", at: 13_000 })).toEqual(finishedWords);
  expect(applyEvent(finishedTime, { type: "start", at: 13_000 })).toEqual(finishedTime);
});

test("DEL-2: a deletion on the empty first word of a Game started on a signal is ignored", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(applyEvent(started, { type: "delete", at: 10_300, unit: "char" })).toEqual(started);
  expect(applyEvent(started, { type: "delete", at: 10_300, unit: "word" })).toEqual(started);
});

test("INS-5: a space on the empty first word of a Game started on a signal is still refused", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(applyEvent(started, { type: "insert", at: 10_300, text: " " })).toEqual(started);
});

test("PURE-1: a start Event never modifies the Game received as input", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const snapshot = structuredClone(game);

  applyEvent(game, { type: "start", at: 10_000 });

  expect(game).toEqual(snapshot);
});

test("RES-6: a time Game started on a signal and ended without any keystroke has a Result of zeros", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  const result = getResult(applyEvent(started, { type: "tick", at: 12_000 }));

  expect(result).toEqual({
    duration: 2,
    wpm: 0,
    rawWpm: 0,
    accuracy: 0,
    charCounts: { correct: 0, incorrect: 0, extra: 0, missed: 0, exactWords: 0 },
  });
});

test("RES-6: a time Game without any word, started on a signal, still has a Result of zeros", () => {
  const game = createGame({ mode: "time", seconds: 2 }, []);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  const result = getResult(applyEvent(started, { type: "tick", at: 12_000 }));

  expect(result.accuracy).toBe(0);
  expect(result.charCounts).toEqual({
    correct: 0,
    incorrect: 0,
    extra: 0,
    missed: 0,
    exactWords: 0,
  });
});
