import { useGameStore } from "../store/useGameStore.ts";

export function useWordCount() {
  return useGameStore((state) => state.game.targetWords.length);
}
