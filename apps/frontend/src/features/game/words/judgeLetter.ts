export type LetterState = "correct" | "incorrect" | "extra" | "untyped" | "missed";

/**
 * The state of the letter at `letterIndex`, given a word and its typed text, both without their Separator.
 * Once the word is validated, a letter never typed is missed rather than still to come.
 */
export function judgeLetter(
  word: string,
  typed: string,
  letterIndex: number,
  isValidated = false,
): LetterState {
  if (letterIndex >= word.length) return "extra";
  const typedChar = typed[letterIndex];
  if (typedChar === undefined) return isValidated ? "missed" : "untyped";
  return typedChar === word[letterIndex] ? "correct" : "incorrect";
}
