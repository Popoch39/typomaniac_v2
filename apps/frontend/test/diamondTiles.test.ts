import { expect, test } from "bun:test";
import { DIAMOND_TILES } from "../src/features/duel/scene/diamondTiles.ts";

test("the Diamond Ornament breaks into a 3 by 3 grid of tiles, clipped as on the canvas", () => {
  expect(DIAMOND_TILES).toHaveLength(9);
  expect(DIAMOND_TILES[0]?.clipPath).toBe("inset(0% 66.67% 66.67% 0%)");
  expect(DIAMOND_TILES[1]?.clipPath).toBe("inset(0% 33.33% 66.67% 33.33%)");
  expect(DIAMOND_TILES[4]?.clipPath).toBe("inset(33.33% 33.33% 33.33% 33.33%)");
  expect(DIAMOND_TILES[8]?.clipPath).toBe("inset(66.67% 0% 0% 66.67%)");
});

test("each Diamond tile keeps the scatter the canvas gives it", () => {
  expect(DIAMOND_TILES[0]).toMatchObject({ x: -330, y: -333, rotate: -14, delay: 0.09 });
  expect(DIAMOND_TILES[7]).toMatchObject({ x: -48, y: 331, rotate: 1, delay: 0 });
});
