import { expect, test } from "bun:test";
import { MASTER_SIDE_KEYS } from "../src/features/duel/scene/masterSideKeys.ts";

test("the side keys of the Master scene spell MASTER, three down each side of the Ornament", () => {
  expect(MASTER_SIDE_KEYS.map((key) => key.letter).join("")).toBe("MASTER");
  expect(MASTER_SIDE_KEYS[0]).toMatchObject({ x: 80, y: 118 });
  expect(MASTER_SIDE_KEYS[2]).toMatchObject({ x: 80, y: 338 });
  expect(MASTER_SIDE_KEYS[3]).toMatchObject({ x: 896, y: 118 });
  expect(MASTER_SIDE_KEYS[5]).toMatchObject({ x: 896, y: 338 });
});

test("the side keys press one after the other, then idle in the same order, as on the canvas", () => {
  expect(MASTER_SIDE_KEYS[0]).toMatchObject({ pressAt: 0.15, idleAt: 3.2 });
  expect(MASTER_SIDE_KEYS[1]?.pressAt).toBeCloseTo(0.32);
  expect(MASTER_SIDE_KEYS[5]?.pressAt).toBeCloseTo(1);
  expect(MASTER_SIDE_KEYS[5]?.idleAt).toBeCloseTo(3.8);
});
