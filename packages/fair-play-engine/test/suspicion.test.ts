import { expect, test } from "bun:test";
import {
  type DuelSignals,
  type GameSignals,
  playerSuspicion,
  SIGNAL_WEIGHTS,
  SUSPICION_GAMES,
} from "../src/index.ts";

const botGame: GameSignals = {
  keyPressEvenness: 1,
  holdEvenness: 1,
  missingRollover: 1,
  flatWordSpeed: 1,
  superhumanSpeed: 1,
  browserHints: 1,
};
const ordinaryGame: GameSignals = {
  keyPressEvenness: 0,
  holdEvenness: 0,
  missingRollover: 0,
  flatWordSpeed: 0,
  superhumanSpeed: 0,
  browserHints: 0,
};
const ordinaryDuels: DuelSignals = {
  levelJump: 0,
  errorlessSeries: 0,
  oneSidedPair: 0,
  lossWithoutTyping: 0,
  reports: 0,
};
const botDuels: DuelSignals = {
  levelJump: 1,
  errorlessSeries: 1,
  oneSidedPair: 1,
  lossWithoutTyping: 1,
  reports: 1,
};
const games = (count: number, game: GameSignals) => Array.from({ length: count }, () => game);

test("SUSPICION-1: a Player whose recent ranked Games and Duels all read as a machine's has the highest Suspicion", () => {
  expect(playerSuspicion(games(SUSPICION_GAMES, botGame), botDuels)).toBeCloseTo(1);
});

test("SUSPICION-1: Suspicion is read from the 20 most recent ranked Games, given newest first, and no older one", () => {
  expect(SUSPICION_GAMES).toBe(20);
  expect(playerSuspicion([...games(20, ordinaryGame), ...games(20, botGame)], ordinaryDuels)).toBe(
    0,
  );
});

test("SUSPICION-2: every signal weighs a set share of a Game's Suspicion, and the shares add up to the whole", () => {
  const total = Object.values(SIGNAL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  expect(total).toBeCloseTo(1);
  const onlyEvenIntervals = { ...ordinaryGame, keyPressEvenness: 1 };
  expect(playerSuspicion(games(20, onlyEvenIntervals), ordinaryDuels)).toBeCloseTo(
    SIGNAL_WEIGHTS.keyPressEvenness,
  );
});

test("SUSPICION-3: one unusual Game among many ordinary ones leaves a Player's Suspicion low", () => {
  expect(playerSuspicion([botGame, ...games(19, ordinaryGame)], ordinaryDuels)).toBeLessThan(0.1);
});

test("SUSPICION-3: a Player with few ranked Games cannot reach a high Suspicion from them alone", () => {
  expect(playerSuspicion([botGame], ordinaryDuels)).toBeLessThan(0.1);
  expect(playerSuspicion([], ordinaryDuels)).toBe(0);
});

test("SUSPICION-2: speed weighs the least: no signal weighs less than it", () => {
  const weights = Object.values(SIGNAL_WEIGHTS);

  expect(weights.every((weight) => weight >= SIGNAL_WEIGHTS.superhumanSpeed)).toBe(true);
});

test("SUSPICION-4: each signal across Duels weighs its share of the Suspicion, however few Games the Player has", () => {
  const oneSidedPair = { ...ordinaryDuels, oneSidedPair: 1 };

  expect(playerSuspicion([], oneSidedPair)).toBeCloseTo(SIGNAL_WEIGHTS.oneSidedPair);
  expect(SIGNAL_WEIGHTS.oneSidedPair).toBeGreaterThan(0);
});

test("SUSPICION-4: a Player trading wins, typing like a person, has their Suspicion raised by the signals across Duels alone", () => {
  const tradingWins = { ...ordinaryDuels, oneSidedPair: 1, lossWithoutTyping: 1 };

  expect(playerSuspicion(games(20, ordinaryGame), tradingWins)).toBeGreaterThan(
    playerSuspicion(games(20, ordinaryGame), ordinaryDuels),
  );
});
