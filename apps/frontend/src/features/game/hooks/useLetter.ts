import { SEPARATOR } from "@repo/typing-engine";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "../store/useGameStore.ts";
import { judgeLetter } from "../words/judgeLetter.ts";
import { withoutSeparator } from "../words/withoutSeparator.ts";

/** One letter's display, selected on its own so a keystroke re-renders only the letters it changes. */
export function useLetter(wordIndex: number, letterIndex: number) {
  return useGameStore(
    useShallow((state) => {
      const { game } = state;
      const word = withoutSeparator(game.targetWords[wordIndex] ?? "");
      const input = game.inputs[wordIndex] ?? "";
      const typed = withoutSeparator(input);
      const isActive = game.status !== "finished" && game.activeWordIndex === wordIndex;
      return {
        char: word[letterIndex] ?? typed[letterIndex] ?? "",
        state: judgeLetter(word, typed, letterIndex, input.endsWith(SEPARATOR)),
        hasCaretBefore: isActive && typed.length === letterIndex,
      };
    }),
  );
}
