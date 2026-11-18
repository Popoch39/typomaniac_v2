import { expect, test } from "bun:test";
import { applyEvent, createGame, type GameEvent } from "@repo/typing-engine";
import { opponentCaretPosition } from "../src/features/duel/caret/opponentCaretPosition.ts";

const play = (...events: GameEvent[]) =>
  events.reduce(applyEvent, createGame({ mode: "time", seconds: 30 }, ["one", "two", "three"]));

const typed = (at: number, text: string): GameEvent => ({ type: "insert", at, text });

test("before any typing the caret sits before the first letter", () => {
  expect(opponentCaretPosition(play())).toEqual({ wordIndex: 0, letterIndex: 0 });
});

test("the caret follows the progress through a word and into the next one", () => {
  expect(opponentCaretPosition(play(typed(1, "on")))).toEqual({ wordIndex: 0, letterIndex: 2 });
  expect(opponentCaretPosition(play(typed(1, "one "), typed(2, "t")))).toEqual({
    wordIndex: 1,
    letterIndex: 1,
  });
});

test("the caret follows corrections, back into a word left wrong", () => {
  const game = play(
    typed(1, "onx "),
    { type: "delete", at: 2, unit: "char" },
    { type: "delete", at: 3, unit: "char" },
  );

  expect(opponentCaretPosition(game)).toEqual({ wordIndex: 0, letterIndex: 2 });
});

test("extra letters, which are not drawn, leave the caret at the end of the word", () => {
  expect(opponentCaretPosition(play(typed(1, "onexyz")))).toEqual({
    wordIndex: 0,
    letterIndex: 3,
  });
});

test("wrong letters move the caret as right ones do, since only the position is drawn", () => {
  expect(opponentCaretPosition(play(typed(1, "tw")))).toEqual({ wordIndex: 0, letterIndex: 2 });
});
