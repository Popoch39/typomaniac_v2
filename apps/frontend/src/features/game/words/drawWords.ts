import { commonWords } from "./commonWords.ts";

/**
 * `count` random common words, never the same word twice in a row. `previousWord` is the word they
 * follow, if any, so that words added to a text do not repeat its last one either.
 */
export function drawWords(count: number, previousWord?: string): string[] {
  const words: string[] = [];
  while (words.length < count) {
    const word = commonWords[Math.floor(Math.random() * commonWords.length)];
    if (word !== undefined && word !== (words.at(-1) ?? previousWord)) words.push(word);
  }
  return words;
}
