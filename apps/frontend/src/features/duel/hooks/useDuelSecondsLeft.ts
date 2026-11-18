import { useDuelCountdownStore } from "../store/useDuelCountdownStore.ts";

export function useDuelSecondsLeft() {
  return useDuelCountdownStore((state) => state.secondsLeft);
}
