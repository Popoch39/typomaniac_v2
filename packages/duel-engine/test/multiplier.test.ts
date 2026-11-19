import { expect, test } from "bun:test";
import { applyEvent, createGame, type Game, type GameEvent } from "@repo/typing-engine";
import { DUEL_GAME_CONFIG, getAverageMultiplier, getCurrentMultiplier } from "../src/index.ts";
import { perfectGame } from "./helpers/game.ts";

const WORDS = ["cat", "dog", "owl", "bee", "elk", "yak", "ant", "cow", "pig", "hen"];

function play(...events: readonly GameEvent[]): Game {
  return events.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, WORDS));
}

/** Types `text` at once, then the Game goes on: the clock never stops in these tests. */
function typed(text: string): Game {
  return play({ type: "start", at: 0 }, { type: "insert", at: 1000, text });
}

test("MULTIPLIER-1: each Perfect word in a row weighs 0.02 more than the one before, from 1", () => {
  // Words weighing 1, 1.02 and 1.04.
  expect(getAverageMultiplier(typed("cat dog owl "))).toBeCloseTo(1.02, 10);
});

test("MULTIPLIER-2: from the sixth Perfect word in a row, a word weighs 1.10 and no more", () => {
  // 1, 1.02, 1.04, 1.06, 1.08, then 1.10 three times: 8.5 over 8 words.
  expect(getAverageMultiplier(typed("cat dog owl bee elk yak ant cow "))).toBeCloseTo(1.0625, 10);
});

test("MULTIPLIER-3: a word with an incorrect Keystroke weighs 1 and ends the Streak", () => {
  // 1, 1.02, then 1 for the mistyped word, then a new Streak from 1: 5.04 over 5 words.
  expect(getAverageMultiplier(typed("cat dog owx bee elk "))).toBeCloseTo(1.008, 10);
});

test("MULTIPLIER-4: a mistake corrected before the word is validated still ends the Streak", () => {
  const game = play(
    { type: "start", at: 0 },
    { type: "insert", at: 1000, text: "cat dox" },
    { type: "delete", at: 1100, unit: "char" },
    { type: "insert", at: 1200, text: "g owl " },
  );

  // 1, then 1 for the corrected word, then a new Streak from 1.
  expect(getAverageMultiplier(game)).toBe(1);
});

test("MULTIPLIER-5: a word validated with a Missed letter ends the Streak", () => {
  // 1, then 1 for `do`, then a new Streak from 1.
  expect(getAverageMultiplier(typed("cat do owl "))).toBe(1);
});

test("MULTIPLIER-6: the word being typed when the clock stops is not counted", () => {
  const game = play(
    { type: "start", at: 0 },
    { type: "insert", at: 1000, text: "cat dog ow" },
    { type: "tick", at: 30_000 },
  );

  expect(game.status).toBe("finished");
  // 1 and 1.02: the half-typed `ow` has no Multiplier.
  expect(getAverageMultiplier(game)).toBeCloseTo(1.01, 10);
});

test("MULTIPLIER-7: a Game without a validated word has a Multiplier of 1", () => {
  expect(getAverageMultiplier(play())).toBe(1);
  expect(getAverageMultiplier(typed("ca"))).toBe(1);
});

test("MULTIPLIER-8: a validated word reopened to correct its mistake stays imperfect", () => {
  const game = play(
    { type: "start", at: 0 },
    { type: "insert", at: 1000, text: "cat dox " },
    // The first deletion takes off the validating space and reopens the word.
    { type: "delete", at: 1100, unit: "char" },
    { type: "delete", at: 1200, unit: "char" },
    { type: "insert", at: 1300, text: "g owl " },
  );

  expect(game.inputs.slice(0, 3)).toEqual(["cat ", "dog ", "owl "]);
  expect(getAverageMultiplier(game)).toBe(1);
});

test("MULTIPLIER-9: on a perfect Game, a 40 WPM Participant reaches nearly the Multiplier of a 100 WPM one", () => {
  // Five characters a word, space included, typed in 30 seconds: 20 words at 40 WPM, 50 at 100 WPM.
  expect(getAverageMultiplier(perfectGame(20))).toBeCloseTo(1.085, 10);
  expect(getAverageMultiplier(perfectGame(50))).toBeCloseTo(1.094, 10);
});

test("MULTIPLIER-10: the current Multiplier is the one the Streak has reached, up to 1.10", () => {
  expect(getCurrentMultiplier(play())).toBe(1);
  expect(getCurrentMultiplier(typed("cat "))).toBe(1);
  expect(getCurrentMultiplier(typed("cat dog owl "))).toBeCloseTo(1.04, 10);
  expect(getCurrentMultiplier(typed("cat dog owl bee elk yak ant cow "))).toBeCloseTo(1.1, 10);
});

test("MULTIPLIER-11: a mistake brings the current Multiplier back to 1 at once, even in the word being typed", () => {
  expect(getCurrentMultiplier(typed("cat dog owx "))).toBe(1);
  expect(getCurrentMultiplier(typed("cat dog owx bee "))).toBe(1);
  expect(getCurrentMultiplier(typed("cat dog ox"))).toBe(1);
  // A word that has no mistake yet leaves the Streak where it was.
  expect(getCurrentMultiplier(typed("cat dog ow"))).toBeCloseTo(1.02, 10);
});

test("MULTIPLIER-12: a validated word whose input is not its Target word is not a Perfect word", () => {
  // The typing engine leaves an incorrect Keystroke on any such word: this Game is built by hand
  // so that the rule does not rest on that alone.
  const played = typed("cat dog owl ");
  const game: Game = {
    ...played,
    inputs: played.inputs.map((input, index) => (index === 1 ? "dxg " : input)),
  };

  // 1, then 1 for `dxg`, then a new Streak from 1.
  expect(getAverageMultiplier(game)).toBe(1);
  expect(getCurrentMultiplier(game)).toBe(1);
});
