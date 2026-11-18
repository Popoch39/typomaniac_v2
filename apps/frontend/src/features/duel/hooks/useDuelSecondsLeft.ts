import { useDuelStore } from "../store/useDuelStore.ts";

export function useDuelSecondsLeft() {
  return useDuelStore((state) => state.secondsLeft);
}
