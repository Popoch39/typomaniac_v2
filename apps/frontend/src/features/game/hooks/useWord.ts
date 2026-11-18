import { SEPARATOR } from "@repo/typing-engine";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "../store/useGameStore.ts";
import { withoutSeparator } from "../words/withoutSeparator.ts";

/** Only what the word itself shows, so a keystroke inside it leaves the word alone and re-renders its letters. */
export function useWord(index: number) {
  return useGameStore(
    useShallow((state) => {
      const { game } = state;
      const target = game.targetWords[index] ?? "";
      const input = game.inputs[index] ?? "";
      const wordLength = withoutSeparator(target).length;
      const typedLength = withoutSeparator(input).length;
      const isActive = game.status !== "finished" && game.activeWordIndex === index;
      return {
        // Extra letters lengthen a word past its target.
        letterCount: Math.max(wordLength, typedLength),
        // A validated word keeps its separator; one that still differs from its target is wrong.
        isWrong: input.endsWith(SEPARATOR) && input !== target,
        hasCaretAtEnd: isActive && typedLength >= wordLength,
      };
    }),
  );
}
