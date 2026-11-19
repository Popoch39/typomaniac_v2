import { expect, test } from "bun:test";
import { MASTER_TILES } from "../src/features/duel/scene/masterTiles.ts";

test("the Master Ornament breaks into the same 3 by 3 grid of tiles as Diamond's", () => {
  expect(MASTER_TILES).toHaveLength(9);
  expect(MASTER_TILES[0]?.clipPath).toBe("inset(0% 66.67% 66.67% 0%)");
  expect(MASTER_TILES[8]?.clipPath).toBe("inset(66.67% 0% 0% 66.67%)");
});

test("each Master tile keeps the scatter the canvas gives it", () => {
  expect(MASTER_TILES[0]).toMatchObject({ x: -258, y: -259, rotate: 14, delay: 0 });
  expect(MASTER_TILES[5]).toMatchObject({ x: 436, y: 13, rotate: 35, delay: 0.01 });
});
