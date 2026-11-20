import { expect, test } from "bun:test";
import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent } from "@repo/typing-engine";
import { replayedWords } from "../src/features/admin/replay/replayedWords.ts";

const gameAfter = (words: readonly string[], text: string) =>
  Array.from(text)
    .map((char, index): GameEvent => ({ type: "insert", at: index * 100, text: char }))
    .reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));

test("the replayed words show each letter as typed, a wrong word's missed letters, and the active word", () => {
  const words = replayedWords(gameAfter(["the", "cat", "sat"], "tje cx"), 10);

  expect(words).toEqual([
    {
      index: 0,
      active: false,
      letters: [
        { char: "t", state: "correct" },
        { char: "h", state: "incorrect" },
        { char: "e", state: "correct" },
      ],
    },
    {
      index: 1,
      active: true,
      letters: [
        { char: "c", state: "correct" },
        { char: "a", state: "incorrect" },
        { char: "t", state: "untyped" },
      ],
    },
    {
      index: 2,
      active: false,
      letters: [
        { char: "s", state: "untyped" },
        { char: "a", state: "untyped" },
        { char: "t", state: "untyped" },
      ],
    },
  ]);
});

test("extra letters lengthen a word, and a validated word's letters never typed are missed", () => {
  const [first, second] = replayedWords(gameAfter(["at", "on"], "atx o "), 2);

  expect(first?.letters).toEqual([
    { char: "a", state: "correct" },
    { char: "t", state: "correct" },
    { char: "x", state: "extra" },
  ]);
  expect(second?.letters).toEqual([
    { char: "o", state: "correct" },
    { char: "n", state: "missed" },
  ]);
});

test("only a few words before the active one are shown, then as many as fit", () => {
  const words = Array.from({ length: 40 }, () => "a");
  const shown = replayedWords(gameAfter(words, "a ".repeat(20)), 12);

  expect(shown.map(({ index }) => index)).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]);
  expect(shown.find(({ active }) => active)?.index).toBe(20);
});
