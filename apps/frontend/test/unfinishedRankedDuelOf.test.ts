import { expect, test } from "bun:test";
import { EdenFetchError } from "@elysia/eden";
import { unfinishedRankedDuelOf } from "../src/features/queue/refusal/unfinishedRankedDuelOf.ts";

test("a Queue refused for an unfinished ranked Duel names the Duel to go back to", () => {
  const refusal = new EdenFetchError(409, { code: "RANKED_DUEL_UNFINISHED", duelId: "d-42" });
  expect(unfinishedRankedDuelOf(refusal)).toBe("d-42");
});

test("no Duel to go back to when the Queue is open, or refused for another reason", () => {
  expect(unfinishedRankedDuelOf(null)).toBeNull();
  expect(unfinishedRankedDuelOf(new EdenFetchError(403, { code: "NICKNAME_REQUIRED" }))).toBeNull();
  expect(
    unfinishedRankedDuelOf(new EdenFetchError(409, { code: "RANKED_DUEL_UNFINISHED" })),
  ).toBeNull();
  expect(unfinishedRankedDuelOf(new Error("Failed to fetch"))).toBeNull();
});
