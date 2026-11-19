import { expect, test } from "bun:test";
import { MASTER_GRID } from "../src/features/duel/scene/masterGrid.ts";

const squareAt = (x: number, y: number) =>
  MASTER_GRID.find((square) => square.x === x && square.y === y);

test("the Master grid covers the stage with the 26 by 17 squares of the Platinum grid", () => {
  expect(MASTER_GRID).toHaveLength(442);
  expect(squareAt(4, 4)).toBeDefined();
  expect(squareAt(1004, 644)).toBeDefined();
});

test("the Master grid blinks out from the Ornament with the landing, at 1.45s, as on the canvas", () => {
  expect(squareAt(484, 244)?.delay).toBeCloseTo(1.45);
  expect(squareAt(444, 44)?.delay).toBeCloseTo(1.69);
  expect(squareAt(4, 4)?.delay).toBeCloseTo(2.17);
});
