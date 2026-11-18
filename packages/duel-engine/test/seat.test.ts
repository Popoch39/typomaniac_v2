import { expect, test } from "bun:test";
import { opponentSeat } from "../src/index.ts";

test("SEAT-1: the Opponent sits on the other seat", () => {
  expect(opponentSeat(0)).toBe(1);
  expect(opponentSeat(1)).toBe(0);
});
