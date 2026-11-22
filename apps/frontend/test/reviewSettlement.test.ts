import { expect, test } from "bun:test";
import { reviewLifecycleOf } from "../src/features/admin/review/reviewLifecycle.ts";
import { settledLine } from "../src/features/admin/review/settledLine.ts";
import { settlementOf } from "../src/features/admin/review/settlementOf.ts";
import { voidableDuels } from "../src/features/admin/review/voidableDuels.ts";

const duel = (duelId: string, outcome: "win" | "loss" | "draw") => ({ duelId, outcome });

test("only the ranked Duels the reviewed Player won can be chosen for voiding: a lost or drawn one is left alone", () => {
  expect(
    voidableDuels([duel("a", "win"), duel("b", "loss"), duel("c", "draw"), duel("d", "win")]),
  ).toEqual([duel("a", "win"), duel("d", "win")]);
});

test("clearing, suspending and banning settle a Review by their decision alone", () => {
  expect(settlementOf("cleared", [])).toEqual({ decision: "cleared" });
  expect(settlementOf("suspension", ["a"])).toEqual({ decision: "suspension" });
  expect(settlementOf("ban", [])).toEqual({ decision: "ban" });
});

test("voiding settles a Review with the Duels chosen, and cannot settle it while none is chosen", () => {
  expect(settlementOf("voided_duels", ["a", "d"])).toEqual({
    decision: "voided_duels",
    duelIds: ["a", "d"],
  });
  expect(settlementOf("voided_duels", [])).toBeNull();
});

test("a settled Review says how it ended", () => {
  expect(settledLine("cleared")).toBe("Settled: the Player is cleared.");
  expect(settledLine("voided_duels")).toBe("Settled: the chosen Duels are voided.");
  expect(settledLine("suspension")).toBe("Settled: the Player is suspended.");
  expect(settledLine("ban")).toBe("Settled: the Player is banned.");
});

test("a Review read without a settlement is open, and one read with a settlement is settled with its decision and instant", () => {
  expect(reviewLifecycleOf(null)).toEqual({ kind: "open" });
  expect(reviewLifecycleOf({ decision: "ban", settledAt: 7000 })).toEqual({
    kind: "settled",
    decision: "ban",
    settledAt: 7000,
  });
});
