import { afterEach, expect, test } from "bun:test";
import type { RankedEnd } from "@repo/duel-engine";
import { useTierPromotionStore } from "../src/features/duel/store/useTierPromotionStore.ts";

const store = useTierPromotionStore;
const placed = { played: 5, total: 5 };
const toGoldFour: RankedEnd = {
  lpDelta: 24,
  rankChange: "promoted",
  rank: { tier: "gold", division: 4, lp: 4 },
  placement: placed,
};
const toGoldThree: RankedEnd = { ...toGoldFour, rank: { tier: "gold", division: 3, lp: 4 } };

afterEach(() => store.getState().reset());

test("a Duel that ends with a Tier promotion opens the scene of the Tier reached", () => {
  store.getState().end(toGoldFour);

  expect(store.getState().promotion?.announcement).toBe("Promoted to Gold IV");
});

test("a dismissed scene is closed, and stays closed for the rest of that Duel", () => {
  store.getState().end(toGoldFour);

  store.getState().dismiss();
  expect(store.getState().promotion).toBeNull();

  store.getState().end(toGoldFour);
  expect(store.getState().promotion).toBeNull();
});

test("a new Duel plays the scene again", () => {
  store.getState().end(toGoldFour);
  store.getState().dismiss();

  store.getState().reset();
  store.getState().end(toGoldFour);

  expect(store.getState().promotion?.tier).toBe("gold");
});

test("a Duel without a Tier promotion never opens the scene", () => {
  store.getState().end(toGoldThree);

  expect(store.getState().promotion).toBeNull();
  expect(store.getState().isLpSweepHeld).toBe(false);
});

test("the LP sweep is held while the scene is open, and released once it is dismissed", () => {
  store.getState().end(toGoldFour);
  expect(store.getState().isLpSweepHeld).toBe(true);

  store.getState().dismiss();
  expect(store.getState().isLpSweepHeld).toBe(false);
});
