import { expect, test } from "bun:test";
import { applyEvent, createGame } from "@repo/typing-engine";
import {
  COUNTDOWN_MS,
  DUEL_GAME_CONFIG,
  DUEL_WORD_COUNT,
  END_GRACE_MS,
  drawWords,
} from "../src/index.ts";

test("CONFIG-1: a Duel Game is a time Game that ends at the first Tick 30 seconds after its Start", () => {
  const game = createGame(DUEL_GAME_CONFIG, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(applyEvent(started, { type: "tick", at: 39_999 }).status).toBe("running");
  expect(applyEvent(started, { type: "tick", at: 40_000 }).status).toBe("finished");
});

test("CONFIG-2: a Duel draws 250 Target words", () => {
  const game = createGame(DUEL_GAME_CONFIG, drawWords(DUEL_WORD_COUNT, Math.random));

  expect(game.targetWords).toHaveLength(250);
});

test("CONFIG-3: the Countdown lasts 3 seconds and the end grace period 2 seconds", () => {
  expect(COUNTDOWN_MS).toBe(3000);
  expect(END_GRACE_MS).toBe(2000);
});
