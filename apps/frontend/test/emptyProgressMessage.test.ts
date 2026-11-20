import { expect, test } from "bun:test";
import { emptyProgressMessage } from "../src/features/progress/filter/emptyProgressMessage.ts";

const NEVER_PLAYED = "Your Progress fills as you play Duels.";

test("no Duel at all among the last 20 or ever is a Player who has not played yet", () => {
  expect(emptyProgressMessage({ window: "20-duels", kind: "all" }, NEVER_PLAYED)).toBe(
    NEVER_PLAYED,
  );
  expect(emptyProgressMessage({ window: "all", kind: "all" }, NEVER_PLAYED)).toBe(NEVER_PLAYED);
});

test("no Duel in the last 30 days says so, not that the Player never played", () => {
  expect(emptyProgressMessage({ window: "30-days", kind: "all" }, NEVER_PLAYED)).toBe(
    "No Duel in the last 30 days.",
  );
  expect(emptyProgressMessage({ window: "30-days", kind: "ranked" }, NEVER_PLAYED)).toBe(
    "No ranked Duel in the last 30 days.",
  );
  expect(emptyProgressMessage({ window: "30-days", kind: "custom" }, NEVER_PLAYED)).toBe(
    "No Custom Duel in the last 30 days.",
  );
});

test("no ranked or no Custom Duel ever says which kind is missing", () => {
  expect(emptyProgressMessage({ window: "20-duels", kind: "ranked" }, NEVER_PLAYED)).toBe(
    "No ranked Duel played yet.",
  );
  expect(emptyProgressMessage({ window: "all", kind: "custom" }, NEVER_PLAYED)).toBe(
    "No Custom Duel played yet.",
  );
});
