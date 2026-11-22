import type { Countdown } from "./countdown.ts";

/**
 * The Countdown's large number and what a screen reader says of it. Nothing is shown until the clock
 * is known, and at 0 the Round is starting.
 */
export function countdownDisplay(countdown: Countdown) {
  const shown =
    countdown.kind === "counting" && countdown.secondsLeft > 0 ? countdown.secondsLeft : null;
  return { shown, label: shown === null ? "Get ready" : `Starting in ${shown}` };
}
