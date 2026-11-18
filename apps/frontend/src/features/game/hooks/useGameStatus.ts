import { useGameStore } from "../store/useGameStore.ts";

export function useGameStatus() {
  return useGameStore((state) => state.game.status);
}
