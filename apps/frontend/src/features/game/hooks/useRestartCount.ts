import { useGameStore } from "../store/useGameStore.ts";

export function useRestartCount() {
  return useGameStore((state) => state.restartCount);
}
