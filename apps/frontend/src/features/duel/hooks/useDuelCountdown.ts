import { countdownDisplay } from "../clock/countdownDisplay.ts";
import { useDuelCountdownStore } from "../store/useDuelCountdownStore.ts";

export function useDuelCountdown() {
  return countdownDisplay(useDuelCountdownStore((state) => state.secondsLeft));
}
