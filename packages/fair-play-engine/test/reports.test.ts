import { expect, test } from "bun:test";
import {
  type DuelSignals,
  type GameSignals,
  readDuelSignals,
  reviewToOpen,
  SUSPICION_GAMES,
} from "../src/index.ts";
import { duel, history } from "./helpers/duels.ts";

// Each Duel against a new Opponent, with a mistake in each Game, so that only the Reports speak.
const played = (reported = false) => duel(70, { opponentId: null, incorrect: 1, reported });

test("REPORT-1: a ranked Duel in which the Opponent reported the Player raises the Report signal", () => {
  expect(readDuelSignals(history(played(), played(), played())).reports).toBe(0);
  expect(readDuelSignals(history(played(), played(true), played())).reports).toBeGreaterThan(0);
});

test("REPORT-1: each Report raises the signal further, up to 1 from 5 reported Duels", () => {
  const reported = (count: number) =>
    readDuelSignals(history(...Array.from({ length: count }, () => played(true)))).reports;

  expect(reported(1)).toBeCloseTo(0.2);
  expect(reported(2)).toBeGreaterThan(reported(1));
  expect(reported(5)).toBe(1);
  expect(reported(8)).toBe(1);
});

test("REPORT-1: only the Reports on the Player's 20 most recent ranked Duels count, as for every signal across Duels", () => {
  const recent = Array.from({ length: 20 }, () => played());

  expect(readDuelSignals(history(played(true), played(true), ...recent)).reports).toBe(0);
});

const ordinaryGame: GameSignals = {
  keyPressEvenness: 0,
  holdEvenness: 0,
  missingRollover: 0,
  flatWordSpeed: 0,
  superhumanSpeed: 0,
  browserHints: 0,
};

test("REPORT-2: Reports never bring a Player who types like a person to a Review, however many", () => {
  const reportedEveryDuel: DuelSignals = readDuelSignals(
    history(...Array.from({ length: 20 }, () => played(true))),
  );

  expect(
    reviewToOpen({
      underReview: false,
      reasonsOpenedBefore: [],
      master: false,
      position: 40,
      gamesSinceLastReview: Array.from({ length: SUSPICION_GAMES }, () => ordinaryGame),
      duelSignalsSinceLastReview: reportedEveryDuel,
    }),
  ).toBeNull();
});
