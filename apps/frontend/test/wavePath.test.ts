import { expect, test } from "bun:test";
import { wavePath } from "../src/features/game/words/wavePath.ts";

const halfWaves = (path: string) => (path.match(/[QT]/g) ?? []).length;
const lastX = (path: string) => Number(path.trim().split(" ").at(-2)?.replace(/^[QT]/, ""));

test("the wave has one crest and one trough per letter", () => {
  expect(halfWaves(wavePath(5))).toBe(10);
});

test("a one-letter word still gets a full crest and trough", () => {
  expect(halfWaves(wavePath(1))).toBe(2);
});

test("the wave stops short of both ends of the word by the same inset", () => {
  const path = wavePath(4);
  const firstX = Number(path.split(" ")[0]?.slice(1));
  expect(firstX).toBeGreaterThan(0);
  expect(lastX(path)).toBeCloseTo(4 - firstX, 3);
});
