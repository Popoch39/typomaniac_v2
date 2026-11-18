import { SEPARATOR } from "@repo/typing-engine";
import { useGameStore } from "../store/useGameStore.ts";
import { withoutSeparator } from "../words/withoutSeparator.ts";

export type LetterState = "correct" | "incorrect" | "extra" | "untyped";

type JudgedLetter = {
  readonly char: string;
  readonly state: LetterState;
};

export type DisplayedLetter = JudgedLetter & {
  readonly hasCaretBefore: boolean;
};

export function useWord(index: number) {
  const target = useGameStore((state) => state.game.targetWords[index] ?? "");
  const input = useGameStore((state) => state.game.inputs[index] ?? "");
  const isActive = useGameStore(
    (state) => state.game.status !== "finished" && state.game.activeWordIndex === index,
  );

  const word = withoutSeparator(target);
  const typed = withoutSeparator(input);
  const expected: JudgedLetter[] = word.split("").map((char, charIndex) => {
    const typedChar = typed[charIndex];
    if (typedChar === undefined) return { char, state: "untyped" };
    return { char, state: typedChar === char ? "correct" : "incorrect" };
  });
  const extra: JudgedLetter[] = typed
    .slice(word.length)
    .split("")
    .map((char) => ({ char, state: "extra" }));
  const caretIndex = isActive ? typed.length : null;
  const letters: DisplayedLetter[] = [...expected, ...extra].map((letter, letterIndex) => ({
    ...letter,
    hasCaretBefore: letterIndex === caretIndex,
  }));

  return {
    letters,
    // A validated word keeps its separator; one that still differs from its target is wrong.
    isWrong: input.endsWith(SEPARATOR) && input !== target,
    hasCaretAtEnd: caretIndex === letters.length,
  };
}
