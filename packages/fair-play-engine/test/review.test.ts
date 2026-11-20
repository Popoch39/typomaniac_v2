import { expect, test } from "bun:test";
import {
  type GameSignals,
  PODIUM_POSITIONS,
  type ReviewCandidate,
  reviewToOpen,
  SUSPICION_GAMES,
  SUSPICION_THRESHOLD,
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

// A Gold Player off the Podium, never reviewed, whose recent ranked Games are ordinary.
const ordinary: ReviewCandidate = {
  underReview: false,
  reasonsOpenedBefore: [],
  master: false,
  position: 40,
  gamesSinceLastReview: games(SUSPICION_GAMES, ordinaryGame),
};

test("REVIEW-1: the Suspicion threshold is a starting value, high, held as a constant", () => {
  expect(SUSPICION_THRESHOLD).toBe(0.6);
  expect(PODIUM_POSITIONS).toBe(3);
});

test("REVIEW-1: a Player whose Suspicion passes the threshold gets a Review with reason Suspicion", () => {
  expect(reviewToOpen({ ...ordinary, gamesSinceLastReview: games(20, botGame) })).toBe("suspicion");
});

test("REVIEW-1: a Player whose Suspicion stays under the threshold gets no Review", () => {
  expect(reviewToOpen(ordinary)).toBeNull();
  // Half of the window typed by a machine reads 0.5, under the threshold.
  expect(
    reviewToOpen({
      ...ordinary,
      gamesSinceLastReview: [...games(10, botGame), ...games(10, ordinaryGame)],
    }),
  ).toBeNull();
});

test("REVIEW-2: a Player in Master gets a Review with reason Master, whatever their Suspicion", () => {
  expect(reviewToOpen({ ...ordinary, master: true })).toBe("master");
});

test("REVIEW-2: a Player on the Podium gets a Review with reason Podium, whatever their Suspicion", () => {
  expect(reviewToOpen({ ...ordinary, position: 3 })).toBe("podium");
  expect(reviewToOpen({ ...ordinary, position: 4 })).toBeNull();
  expect(reviewToOpen({ ...ordinary, position: null })).toBeNull();
});

test("REVIEW-2: reaching Master or the Podium opens a Review once", () => {
  expect(reviewToOpen({ ...ordinary, master: true, reasonsOpenedBefore: ["master"] })).toBeNull();
  expect(reviewToOpen({ ...ordinary, position: 1, reasonsOpenedBefore: ["podium"] })).toBeNull();
});

test("REVIEW-2: a Player in Master who enters the Podium is reviewed for Master first, then for the Podium", () => {
  const atTop = { ...ordinary, master: true, position: 1 };
  expect(reviewToOpen(atTop)).toBe("master");
  expect(reviewToOpen({ ...atTop, reasonsOpenedBefore: ["master"] })).toBe("podium");
});

test("REVIEW-3: a Player with an open Review gets no second one, whatever the reason", () => {
  expect(
    reviewToOpen({
      ...ordinary,
      underReview: true,
      master: true,
      position: 1,
      gamesSinceLastReview: games(20, botGame),
    }),
  ).toBeNull();
});

test("REVIEW-3: a Review by Suspicion may open again after the last one was settled", () => {
  expect(
    reviewToOpen({
      ...ordinary,
      reasonsOpenedBefore: ["suspicion"],
      gamesSinceLastReview: games(20, botGame),
    }),
  ).toBe("suspicion");
});

test("REVIEW-4: only the Games played after the last settled Review count, the missing ones counting as ordinary", () => {
  // A cleared Player with a few bot-like Games since stays under the threshold.
  expect(reviewToOpen({ ...ordinary, gamesSinceLastReview: games(5, botGame) })).toBeNull();
  expect(reviewToOpen({ ...ordinary, gamesSinceLastReview: games(15, botGame) })).toBe("suspicion");
});
