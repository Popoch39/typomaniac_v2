import { useDuelStore } from "../store/useDuelStore.ts";

export function useDuelRefusalMessage() {
  return useDuelStore((state) => state.refusal);
}
