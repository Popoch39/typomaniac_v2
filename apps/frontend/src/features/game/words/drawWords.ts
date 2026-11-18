import { commonWords } from "./commonWords.ts";

/** `count` random common words, never the same word twice in a row. */
export function drawWords(count: number): string[] {
  const words: string[] = [];
  while (words.length < count) {
    const word = commonWords[Math.floor(Math.random() * commonWords.length)];
    if (word !== undefined && word !== words.at(-1)) words.push(word);
  }
  return words;
}
