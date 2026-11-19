import { expect, test } from "bun:test";
import { lpBarCells } from "../src/shared/lib/lpBarCells.ts";

test("LP that did not move leave every cell still", () => {
  const cells = lpBarCells(35, 35, 100, 10);

  expect(cells.map((cell) => cell.fill)).toEqual([1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0]);
  expect(cells.every((cell) => cell.fromFill === cell.fill && cell.start === cell.end)).toBe(true);
});

test("a gain fills the cells it crosses left to right, at one steady pace", () => {
  const cells = lpBarCells(40, 20, 100, 10);

  expect(cells[1]).toEqual({ fill: 1, fromFill: 1, start: 0, end: 0 });
  expect(cells[2]).toEqual({ fill: 1, fromFill: 0, start: 0, end: 0.5 });
  expect(cells[3]).toEqual({ fill: 1, fromFill: 0, start: 0.5, end: 1 });
  expect(cells[4]).toEqual({ fill: 0, fromFill: 0, start: 1, end: 1 });
});

test("a loss empties the cells it crosses right to left", () => {
  const cells = lpBarCells(75, 100, 100, 10);

  expect(cells[9]).toEqual({ fill: 0, fromFill: 1, start: 0, end: 0.4 });
  expect(cells[8]).toEqual({ fill: 0, fromFill: 1, start: 0.4, end: 0.8 });
  expect(cells[7]).toEqual({ fill: 0.5, fromFill: 1, start: 0.8, end: 1 });
  expect(cells[6]).toEqual({ fill: 1, fromFill: 1, start: 1, end: 1 });
});

test("LP outside the Division are held at its bounds", () => {
  const cells = lpBarCells(140, -10, 100, 10);

  expect(cells.every((cell) => cell.fill === 1 && cell.fromFill === 0)).toBe(true);
  expect(cells[0]).toEqual({ fill: 1, fromFill: 0, start: 0, end: 0.1 });
});
