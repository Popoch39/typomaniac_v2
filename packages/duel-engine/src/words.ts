import { commonWords } from "./common-words.ts";

/** A source of random numbers in [0, 1), like `Math.random`: passed in so that the draw stays pure. */
export type RandomSource = () => number;

/**
 * `count` random common words, never the same word twice in a row. `previousWord` is the word they
 * follow, if any, so that words added to a text do not repeat its last one either.
 */
export function drawWords(count: number, random: RandomSource, previousWord?: string): string[] {
  const words: string[] = [];
  while (words.length < count) {
    const word = commonWords[Math.floor(random() * commonWords.length)];
    if (word !== undefined && word !== (words.at(-1) ?? previousWord)) words.push(word);
  }
  return words;
}
