import { useDuelStore } from "../store/useDuelStore.ts";

export function useDuelReconnecting() {
  return useDuelStore((state) => state.isReconnecting);
}
