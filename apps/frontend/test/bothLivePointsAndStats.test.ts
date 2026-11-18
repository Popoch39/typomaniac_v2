import { expect, test } from "bun:test";
import { applyEvent, createGame, type Game, type GameEvent } from "@repo/typing-engine";
import { bothLivePointsAndStats } from "../src/features/duel/points/bothLivePointsAndStats.ts";

const play = (...events: GameEvent[]): Game =>
  events.reduce(applyEvent, createGame({ mode: "time", seconds: 30 }, ["cat", "dog", "fox"]));

const started = (at: number): GameEvent => ({ type: "start", at });
const typed = (at: number, text: string): GameEvent => ({ type: "insert", at, text });

test("both Points read 0 before anything is typed", () => {
  const sides = bothLivePointsAndStats(play(started(0)), play(started(5000)), 3000);

  expect(sides.self.points).toBe(0);
  expect(sides.opponent.points).toBe(0);
});

test("the Opponent's Points read 0 before their Game has reached the Participant", () => {
  expect(bothLivePointsAndStats(play(started(0)), null, 3000).opponent).toEqual({
    points: 0,
    wpm: 0,
    accuracy: 0,
  });
});

test("the Participant's own Points are shown with the WPM and Accuracy they are made of", () => {
  const self = play(started(0), typed(1000, "cat dog "));

  expect(bothLivePointsAndStats(self, play(started(0)), 6000).self).toEqual({
    points: 160,
    wpm: 16,
    accuracy: 100,
  });
});

test("a mistake makes the Participant's own Points drop", () => {
  const self = play(started(0), typed(1000, "cat dox "));

  expect(bothLivePointsAndStats(self, play(started(0)), 6000).self).toEqual({
    points: 61,
    wpm: 8,
    accuracy: 87,
  });
});

test("the Opponent's Points are read as long after their Start as the Participant's own", () => {
  // The Opponent's Game runs on their own clock, which here reads 5000 at the shared Start.
  const opponent = play(started(5000), typed(6000, "cat dog "));

  expect(bothLivePointsAndStats(play(started(0)), opponent, 6000).opponent).toEqual({
    points: 160,
    wpm: 16,
    accuracy: 100,
  });
});
