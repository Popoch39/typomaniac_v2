import { getResult } from "@repo/typing-engine";
import { useGameStore } from "../store/useGameStore.ts";

/** Only for a finished Game: the engine refuses to compute the Result of any other. */
export function useResult() {
  const game = useGameStore((state) => state.game);
  const result = getResult(game);
  return { wpm: result.wpm, accuracy: result.accuracy };
}
