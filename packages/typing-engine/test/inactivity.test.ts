import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult, type Game } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** A time Game of `seconds` on a single long word, so that every letter typed is an accepted insertion. */
function timeGame(seconds: number): Game {
  return createGame({ mode: "time", seconds }, [ALPHABET]);
}

/** Result of a 1-word words Game on `word`, typed one character at each of `instants` (ms). */
function resultOfWord(word: string, instants: readonly number[]) {
  const game = createGame({ mode: "words", wordCount: 1 }, [word]);
  const finished = Array.from(word).reduce(
    (current, char, index) =>
      applyEvent(current, { type: "insert", at: instants[index] ?? 0, text: char }),
    game,
  );
  return getResult(finished);
}

test("IDLE-1: the inactivity duration is the number of one-second buckets without any key press or insertion", () => {
  // Insertions at 0, 218, 437, 646 and 3108 ms, each one 8 ms after its key press.
  const typing = [0, 218, 437, 646, 3108].reduce((current, at, index) => {
    const pressed = applyEvent(current, { type: "keyDown", at: at - 8, code: "KeyA" });
    const typed = applyEvent(pressed, { type: "insert", at, text: ALPHABET[index] ?? "" });
    return applyEvent(typed, { type: "keyUp", at: at + 70, code: "KeyA" });
  }, timeGame(4));

  const result = getResult(applyEvent(typing, { type: "tick", at: 4002 }));

  // Buckets ending at 1000, 2000, 3000 and 4000 ms: the second and the third are empty.
  expect(result.inactiveSeconds).toBe(2);
  // Presses at −8, 210, 429, 638 and 3100 ms: 210 − 0, 219, 209 and 2462.
  expect(result.keyPressGaps).toEqual([210, 219, 209, 2462]);
  expect(result.keyHoldDurations).toEqual([78, 78, 78, 78, 78]);
});

test("IDLE-1: a bucket holding only a key press is not inactive", () => {
  const typing = typeText(timeGame(3), "a", 0, 0);
  // "Tab" inserts nothing: pressed 1.5 s after the start.
  const pressed = applyEvent(typing, { type: "keyDown", at: 1500, code: "Tab" });

  const result = getResult(applyEvent(pressed, { type: "tick", at: 3000 }));

  // Only the third second is empty.
  expect(result.inactiveSeconds).toBe(1);
});

test("IDLE-1: a bucket holding only a deletion is not inactive", () => {
  const typing = typeText(timeGame(3), "ab", 0, 100);
  const corrected = applyEvent(typing, { type: "delete", at: 1500, unit: "char" });

  const result = getResult(applyEvent(corrected, { type: "tick", at: 3000 }));

  expect(result.inactiveSeconds).toBe(1);
});

test("IDLE-1: a deletion that is ignored is not an activity", () => {
  const started = applyEvent(timeGame(2), { type: "start", at: 0 });
  // Nothing to delete on the empty first word.
  const ignored = applyEvent(started, { type: "delete", at: 500, unit: "char" });

  const result = getResult(applyEvent(ignored, { type: "tick", at: 2000 }));

  expect(result.inactiveSeconds).toBe(2);
});

test("IDLE-1: the press kept from before the start counts in the first bucket", () => {
  const pressed = applyEvent(timeGame(2), { type: "keyDown", at: 990, code: "KeyA" });
  const started = applyEvent(pressed, { type: "start", at: 1000 });

  const result = getResult(applyEvent(started, { type: "tick", at: 3000 }));

  expect(result.inactiveSeconds).toBe(1);
});

test("IDLE-1: the shorter last bucket of a words Game counts as one", () => {
  // Buckets ending at 1000, 2000 and 2500 ms, the second one empty.
  expect(resultOfWord("ab", [0, 2500]).inactiveSeconds).toBe(1);
  // Buckets ending at 1000 and 2000 ms: the last keystroke, at 2400 ms, is in none.
  expect(resultOfWord("ab", [0, 2400]).inactiveSeconds).toBe(1);
});

test("IDLE-2: the final inactivity is true when the last 5 buckets hold no insertion", () => {
  const typing = typeText(timeGame(7), "abcdefghi", 0, 200);

  const result = getResult(applyEvent(typing, { type: "tick", at: 7000 }));

  // Insertions per bucket: 6, 3, 0, 0, 0, 0, 0.
  expect(result.inactiveAtEnd).toBe(true);
  expect(result.inactiveSeconds).toBe(5);
});

test("IDLE-2: the final inactivity is false when one of the last 5 buckets holds an insertion", () => {
  const typing = typeText(typeText(timeGame(6), "abcde", 0, 200), "f", 5500, 0);

  const result = getResult(applyEvent(typing, { type: "tick", at: 6000 }));

  // Insertions per bucket: 5, 0, 0, 0, 0, 1.
  expect(result.inactiveAtEnd).toBe(false);
});

test("IDLE-2: key presses and deletions in the last 5 buckets do not prevent the final inactivity", () => {
  const typing = typeText(timeGame(6), "abcde", 0, 100);
  const corrected = applyEvent(typing, { type: "delete", at: 3500, unit: "char" });
  const pressed = applyEvent(corrected, { type: "keyDown", at: 5500, code: "Tab" });

  const result = getResult(applyEvent(pressed, { type: "tick", at: 6000 }));

  expect(result.inactiveAtEnd).toBe(true);
  // The fourth and the sixth seconds are not inactive.
  expect(result.inactiveSeconds).toBe(3);
});

test("IDLE-2: what is typed after the last bucket does not prevent the final inactivity", () => {
  // 7.3 s: no shorter last bucket, so the 7 buckets hold 1, 0, 0, 0, 0, 0, 0 insertions.
  expect(resultOfWord("ab", [0, 7300]).inactiveAtEnd).toBe(true);
});

test("IDLE-3: a Game with fewer than 5 buckets is judged on all of them", () => {
  // Insertions per bucket: 1, 0, 1.
  expect(resultOfWord("ab", [0, 2500]).inactiveAtEnd).toBe(false);

  const started = applyEvent(timeGame(2), { type: "start", at: 0 });
  // Insertions per bucket: 0, 0.
  expect(getResult(applyEvent(started, { type: "tick", at: 2000 })).inactiveAtEnd).toBe(true);
});

test("IDLE-3: a Game without any bucket is inactive at the end, with no inactive second", () => {
  const result = resultOfWord("ab", [0, 400]);

  expect(result.inactiveAtEnd).toBe(true);
  expect(result.inactiveSeconds).toBe(0);
});
