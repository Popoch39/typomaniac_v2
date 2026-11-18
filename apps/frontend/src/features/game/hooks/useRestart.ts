import { useGameStore } from "../store/useGameStore.ts";

export function useRestart() {
  return useGameStore((state) => state.restart);
}
