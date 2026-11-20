import { expect, test } from "bun:test";
import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import {
  nextViolationSanction,
  playerSuspicion,
  rankedOpensAt,
  readDuelSignals,
  readGameSignals,
  reviewToOpen,
} from "../src/index.ts";
import { duel } from "./helpers/duels.ts";
import { person, targetWords, typeJournal } from "./helpers/journal.ts";

test("PURE-1: reading when ranked opens never modifies the creation dates it receives", () => {
  const createdAts = [Date.UTC(2026, 10, 1), null];
  const untouched = structuredClone(createdAts);

  rankedOpensAt(createdAts);

  expect(createdAts).toEqual(untouched);
});

test("PURE-1: the same creation dates always give the same instant", () => {
  const createdAts = [Date.UTC(2026, 10, 1), Date.UTC(2025, 0, 1)];

  expect(rankedOpensAt(createdAts)).toBe(rankedOpensAt(structuredClone(createdAts)));
});

test("PURE-1: the creation dates and the instant pass through JSON unchanged", () => {
  const createdAts = [Date.UTC(2026, 10, 1), null];
  const opensAt = rankedOpensAt(createdAts);

  expect(JSON.parse(JSON.stringify(createdAts))).toEqual(createdAts);
  expect(JSON.parse(JSON.stringify(opensAt))).toBe(opensAt);
});

test("PURE-1: the next Sanction for a Violation depends on the count alone and passes through JSON unchanged", () => {
  const sanction = nextViolationSanction(2);

  expect(nextViolationSanction(2)).toEqual(sanction);
  expect(JSON.parse(JSON.stringify(sanction))).toEqual(sanction);
});

const played = { config: DUEL_GAME_CONFIG, targetWords, journal: typeJournal(person(90)) };

test("PURE-1: reading the signals of a Game never modifies its journal nor its Target words", () => {
  const untouched = structuredClone(played);

  readGameSignals(played);

  expect(played).toEqual(untouched);
});

test("PURE-1: the same journal always gives the same signals, and they pass through JSON unchanged", () => {
  const signals = readGameSignals(played);

  expect(readGameSignals(structuredClone(played))).toEqual(signals);
  expect(JSON.parse(JSON.stringify(signals))).toEqual(signals);
});

test("PURE-1: Suspicion never modifies the signals it is read from and is the same for the same signals", () => {
  const recentGames = [readGameSignals(played), readGameSignals(played)];
  const duelSignals = readDuelSignals([duel(70), duel(72)]);
  const untouched = structuredClone({ recentGames, duelSignals });
  const suspicion = playerSuspicion(recentGames, duelSignals);

  expect({ recentGames, duelSignals }).toEqual(untouched);
  expect(playerSuspicion(structuredClone(recentGames), structuredClone(duelSignals))).toBe(
    suspicion,
  );
  expect(JSON.parse(JSON.stringify(suspicion))).toBe(suspicion);
});

test("PURE-1: deciding a Review never modifies what it is given, is the same for the same Player and passes through JSON unchanged", () => {
  const candidate = {
    underReview: false,
    reasonsOpenedBefore: ["master" as const],
    master: true,
    position: 2,
    gamesSinceLastReview: [readGameSignals(played)],
    duelSignalsSinceLastReview: readDuelSignals(recentDuels),
  };
  const untouched = structuredClone(candidate);
  const reason = reviewToOpen(candidate);

  expect(candidate).toEqual(untouched);
  expect(reviewToOpen(structuredClone(candidate))).toBe(reason);
  expect(JSON.parse(JSON.stringify(reason))).toBe(reason);
});

const recentDuels = [
  duel(70, { opponentId: "rival", outcome: "loss", incorrect: 1 }),
  duel(140, { opponentId: "rival" }),
  duel(65, { opponentId: null, outcome: "draw" }),
];

test("PURE-1: reading the signals across Duels never modifies the Duels it receives", () => {
  const untouched = structuredClone(recentDuels);

  readDuelSignals(recentDuels);

  expect(recentDuels).toEqual(untouched);
});

test("PURE-1: the same Duels always give the same signals across Duels, and they pass through JSON unchanged", () => {
  const signals = readDuelSignals(recentDuels);

  expect(readDuelSignals(structuredClone(recentDuels))).toEqual(signals);
  expect(JSON.parse(JSON.stringify(signals))).toEqual(signals);
});
