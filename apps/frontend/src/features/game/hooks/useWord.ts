import { useGameStore } from "../store/useGameStore.ts";

export type LetterState = "correct" | "incorrect" | "extra" | "untyped";

export type DisplayedLetter = {
  readonly char: string;
  readonly state: LetterState;
};

function withoutSeparator(text: string) {
  return text.endsWith(" ") ? text.slice(0, -1) : text;
}

export function useWord(index: number) {
  const target = useGameStore((state) => state.game.targetWords[index] ?? "");
  const input = useGameStore((state) => state.game.inputs[index] ?? "");
  const isActive = useGameStore(
    (state) => state.game.status !== "finished" && state.game.activeWordIndex === index,
  );

  const word = withoutSeparator(target);
  const typed = withoutSeparator(input);
  const expected: DisplayedLetter[] = word.split("").map((char, charIndex) => {
    const typedChar = typed[charIndex];
    if (typedChar === undefined) return { char, state: "untyped" };
    return { char, state: typedChar === char ? "correct" : "incorrect" };
  });
  const extra: DisplayedLetter[] = typed
    .slice(word.length)
    .split("")
    .map((char) => ({ char, state: "extra" }));

  return {
    letters: [...expected, ...extra],
    caretIndex: isActive ? typed.length : null,
  };
}
