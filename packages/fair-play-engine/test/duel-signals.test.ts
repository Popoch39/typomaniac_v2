import { expect, test } from "bun:test";
import { readDuelSignals, SUSPICION_DUELS } from "../src/index.ts";
import { duel, history, idleGame } from "./helpers/duels.ts";

// Each Duel against a new Opponent, with a mistake in each Game, so that only the signal under test speaks.
const played = (wpm: number) => duel(wpm, { opponentId: null, incorrect: 1 });

test("ACROSS-1: a Player whose WPM doubles from one ranked Duel to the next scores high on the level jump", () => {
  const duels = history(played(60), played(62), played(58), played(120));

  expect(readDuelSignals(duels).levelJump).toBe(1);
});

test("ACROSS-1: ordinary progress from one ranked Duel to the next does not read as a level jump", () => {
  const duels = history(played(60), played(64), played(66), played(70), played(75));

  expect(readDuelSignals(duels).levelJump).toBe(0);
});

test("ACROSS-1: a Duel in which the Player typed nothing is no level to jump from", () => {
  const away = {
    opponentId: null,
    outcome: "loss" as const,
    reported: false,
    games: [idleGame, idleGame],
  };
  const duels = history(played(60), away, played(64));

  expect(readDuelSignals(duels).levelJump).toBe(0);
});

const clean = (wpm: number) => duel(wpm, { opponentId: null });

test("ACROSS-2: a long series of Games without a single incorrect Keystroke scores high", () => {
  const duels = history(...Array.from({ length: 8 }, () => clean(70)));

  expect(readDuelSignals(duels).errorlessSeries).toBe(1);
});

test("ACROSS-2: a few Games without an incorrect Keystroke among Games with mistakes do not", () => {
  const duels = history(played(70), clean(70), clean(72), played(71), clean(70), played(69));

  expect(readDuelSignals(duels).errorlessSeries).toBe(0);
});

test("ACROSS-2: a Game in which the Player typed nothing breaks a series", () => {
  const away = { opponentId: null, outcome: "loss" as const, reported: false, games: [idleGame] };
  const series = Array.from({ length: 2 }, () => clean(70));

  expect(readDuelSignals(history(...series, away, ...series)).errorlessSeries).toBe(0);
  expect(readDuelSignals(history(...series, ...series)).errorlessSeries).toBeGreaterThan(0);
});

const against = (opponentId: string, outcome: "win" | "loss" | "draw") =>
  duel(70, { opponentId, outcome, incorrect: 1 });

test("ACROSS-3: two Players who keep meeting, one always winning, both score high on the pair signal", () => {
  const winner = history(...Array.from({ length: 6 }, () => against("loser", "win")));
  const loser = history(...Array.from({ length: 6 }, () => against("winner", "loss")));

  expect(readDuelSignals(winner).oneSidedPair).toBe(1);
  expect(readDuelSignals(loser).oneSidedPair).toBe(1);
});

test("ACROSS-3: two Players who met twice with mixed Outcomes do not", () => {
  const duels = history(against("rival", "win"), played(70), against("rival", "loss"));

  expect(readDuelSignals(duels).oneSidedPair).toBe(0);
});

test("ACROSS-3: two Players who meet often with Outcomes shared between them do not", () => {
  const outcomes = ["win", "loss", "draw", "loss", "win", "win", "loss"] as const;
  const duels = history(...outcomes.map((outcome) => against("rival", outcome)));

  expect(readDuelSignals(duels).oneSidedPair).toBe(0);
});

const thrown = (opponentId: string | null = null) => ({
  opponentId,
  outcome: "loss" as const,
  reported: false,
  games: [idleGame, idleGame],
});

test("ACROSS-4: a Player who repeatedly loses ranked Duels without typing scores high", () => {
  const duels = history(played(70), thrown(), played(72), thrown(), thrown(), thrown());

  expect(readDuelSignals(duels).lossWithoutTyping).toBe(1);
});

test("ACROSS-4: one Duel lost without typing, or Duels lost while typing, do not", () => {
  const lostWhileTyping = duel(70, { opponentId: null, outcome: "loss", incorrect: 1 });

  expect(readDuelSignals(history(played(70), thrown(), played(72))).lossWithoutTyping).toBe(0);
  expect(
    readDuelSignals(history(lostWhileTyping, lostWhileTyping, lostWhileTyping, lostWhileTyping))
      .lossWithoutTyping,
  ).toBe(0);
});

test("ACROSS-4: a Duel without typing that the Player did not lose is no loss without typing", () => {
  const drawn = { ...thrown(), outcome: "draw" as const };

  expect(readDuelSignals(history(drawn, drawn, drawn, drawn)).lossWithoutTyping).toBe(0);
});

test("ACROSS-5: the signals across Duels read the Player's 20 most recent ranked Duels, and no older one", () => {
  const recent = Array.from({ length: 20 }, () => played(70));
  const duels = history(thrown(), thrown(), thrown(), thrown(), ...recent);

  expect(SUSPICION_DUELS).toBe(20);
  expect(readDuelSignals(duels).lossWithoutTyping).toBe(0);
});
