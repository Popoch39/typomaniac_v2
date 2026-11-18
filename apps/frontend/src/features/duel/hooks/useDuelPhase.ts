import { useDuelStore } from "../store/useDuelStore.ts";

export function useDuelPhase() {
  return useDuelStore((state) => state.phase);
}
