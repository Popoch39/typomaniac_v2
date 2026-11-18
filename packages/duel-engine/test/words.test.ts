import { expect, test } from "bun:test";
import { commonWords, drawWords } from "../src/index.ts";

/** A random source that returns the given values in turn, then starts over. */
function sequence(...values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

/** The value that makes the draw pick the word at `index` of the common words. */
function pick(index: number): number {
  return (index + 0.5) / commonWords.length;
}

test("WORDS-1: the draw picks common words, in the order given by the random source", () => {
  const words = drawWords(3, sequence(0, pick(1), 0.999_999));

  expect(words).toEqual(["the", "be", "end"]);
});

test("WORDS-2: the draw is deterministic for a given random source", () => {
  const random = sequence(0.42, 0.07, 0.93, 0.5, 0.31);

  const first = drawWords(250, sequence(0.42, 0.07, 0.93, 0.5, 0.31));
  const second = drawWords(250, random);

  expect(second).toEqual(first);
  expect(second).toHaveLength(250);
});

test("WORDS-3: the draw never gives the same word twice in a row", () => {
  const words = drawWords(3, sequence(0, 0, 0, pick(1), pick(1), 0));

  expect(words).toEqual(["the", "be", "the"]);
});

test("WORDS-3: the first word drawn never repeats the word it follows", () => {
  const words = drawWords(2, sequence(0, pick(1), pick(2)), "the");

  expect(words).toEqual(["be", "to"]);
});

test("WORDS-4: the common words are distinct lowercase words without any space", () => {
  expect(commonWords.length).toBeGreaterThan(1);
  expect(new Set(commonWords).size).toBe(commonWords.length);
  for (const word of commonWords) expect(word).toMatch(/^[a-z]+$/);
});
