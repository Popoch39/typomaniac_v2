import { expect, test } from "bun:test";
import {
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
};
const ordinaryGame: GameSignals = {
  keyPressEvenness: 0,
  holdEvenness: 0,
  missingRollover: 0,
  flatWordSpeed: 0,
  superhumanSpeed: 0,
};
const games = (count: number, game: GameSignals) => Array.from({ length: count }, () => game);

test("SUSPICION-1: a Player whose recent ranked Games all read as a machine's has the highest Suspicion", () => {
  expect(playerSuspicion(games(SUSPICION_GAMES, botGame))).toBe(1);
});

test("SUSPICION-1: Suspicion is read from the 20 most recent ranked Games, given newest first, and no older one", () => {
  expect(SUSPICION_GAMES).toBe(20);
  expect(playerSuspicion([...games(20, ordinaryGame), ...games(20, botGame)])).toBe(0);
});

test("SUSPICION-2: every signal weighs a set share of a Game's Suspicion, and the shares add up to the whole", () => {
  const total = Object.values(SIGNAL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  expect(total).toBeCloseTo(1);
  const onlyEvenIntervals = { ...ordinaryGame, keyPressEvenness: 1 };
  expect(playerSuspicion(games(20, onlyEvenIntervals))).toBeCloseTo(
    SIGNAL_WEIGHTS.keyPressEvenness,
  );
});

test("SUSPICION-3: one unusual Game among many ordinary ones leaves a Player's Suspicion low", () => {
  expect(playerSuspicion([botGame, ...games(19, ordinaryGame)])).toBeLessThan(0.1);
});

test("SUSPICION-3: a Player with few ranked Games cannot reach a high Suspicion from them alone", () => {
  expect(playerSuspicion([botGame])).toBeLessThan(0.1);
  expect(playerSuspicion([])).toBe(0);
});
