import { useGameStore } from "../store/useGameStore.ts";

/** A boolean rather than the status, so the game screen does not re-render when the Game starts. */
export function useIsGameFinished() {
  return useGameStore((state) => state.game.status === "finished");
}
