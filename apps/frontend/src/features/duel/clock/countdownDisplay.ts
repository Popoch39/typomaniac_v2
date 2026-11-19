/**
 * The Countdown's large number and what a screen reader says of it. Nothing is shown until the clock
 * is known, and at 0 the Round is starting.
 */
export function countdownDisplay(secondsLeft: number | null) {
  const shown = secondsLeft !== null && secondsLeft > 0 ? secondsLeft : null;
  return { shown, label: shown === null ? "Get ready" : `Starting in ${shown}` };
}
