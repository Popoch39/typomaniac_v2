export type LetterState = "correct" | "incorrect" | "extra" | "untyped";

/** The state of the letter at `letterIndex`, given a word and its typed text, both without their Separator. */
export function judgeLetter(word: string, typed: string, letterIndex: number): LetterState {
  if (letterIndex >= word.length) return "extra";
  const typedChar = typed[letterIndex];
  if (typedChar === undefined) return "untyped";
  return typedChar === word[letterIndex] ? "correct" : "incorrect";
}
