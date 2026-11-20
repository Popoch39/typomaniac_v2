import { expect, test } from "bun:test";
import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { readGameSignals } from "../src/index.ts";
import { machine, person, targetWords, typeJournal } from "./helpers/journal.ts";

const signalsOf = (typist: Parameters<typeof typeJournal>[0]) =>
  readGameSignals({ config: DUEL_GAME_CONFIG, targetWords, journal: typeJournal(typist) });

test("SIGNAL-1: a journal typed at an even machine rhythm scores high on the evenness of its intervals; a person's scores low", () => {
  expect(signalsOf(machine(70)).keyPressEvenness).toBe(1);
  expect(signalsOf(person(90)).keyPressEvenness).toBe(0);
});

test("SIGNAL-2: keys all held as long as each other score high on the evenness of hold times; a person's holds score low", () => {
  expect(signalsOf(machine(70)).holdEvenness).toBe(1);
  expect(signalsOf(person(90)).holdEvenness).toBe(0);
});

test("SIGNAL-3: each key released before the next goes down at high speed scores high; a person's key rollover scores low", () => {
  expect(signalsOf(machine(70)).missingRollover).toBe(1);
  expect(signalsOf(person(90)).missingRollover).toBe(0);
});

test("SIGNAL-4: rare words typed as fast as frequent ones score high; a person slowed by rare words scores low", () => {
  expect(signalsOf(machine(70)).flatWordSpeed).toBe(1);
  expect(signalsOf(person(90)).flatWordSpeed).toBe(0);
});

test("SIGNAL-5: a Game far above human speed scores high on the speed signal; a fast human Game does not", () => {
  // 20 ms per character is 600 WPM; a person around 50 ms types about 200 WPM.
  expect(signalsOf(machine(20)).superhumanSpeed).toBe(1);
  expect(signalsOf(person(50)).superhumanSpeed).toBe(0);
});

test("SIGNAL-6: a Game with too few KeyPresses to judge says nothing on any signal", () => {
  const silent = readGameSignals({
    config: DUEL_GAME_CONFIG,
    targetWords,
    journal: typeJournal(machine(70), ["the", "cat"]),
  });

  expect(Object.values(silent)).toEqual([0, 0, 0, 0, 0]);
});

test("SIGNAL-3: below high speed, typing without key rollover says nothing", () => {
  expect(signalsOf(machine(200)).missingRollover).toBe(0);
});
