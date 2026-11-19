import { expect, test } from "bun:test";
import { PLATINUM_GRID } from "../src/features/duel/scene/platinumGrid.ts";

const squareAt = (x: number, y: number) =>
  PLATINUM_GRID.find((square) => square.x === x && square.y === y);

test("the Platinum grid covers the stage with 26 by 17 squares, 40px apart", () => {
  expect(PLATINUM_GRID).toHaveLength(442);
  expect(squareAt(4, 4)).toBeDefined();
  expect(squareAt(1004, 644)).toBeDefined();
  expect(squareAt(44, 44)).toBeDefined();
});

test("the Platinum grid blinks out from the Ornament, a step of 0.06s every 48px, as on the canvas", () => {
  expect(squareAt(484, 244)?.delay).toBeCloseTo(1.32);
  expect(squareAt(524, 244)?.delay).toBeCloseTo(1.32);
  expect(squareAt(444, 244)?.delay).toBeCloseTo(1.38);
  expect(squareAt(604, 244)?.delay).toBeCloseTo(1.44);
  expect(squareAt(4, 4)?.delay).toBeCloseTo(2.04);
  expect(squareAt(1004, 644)?.delay).toBeCloseTo(2.1);
});
