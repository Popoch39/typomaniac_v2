import { useDuelSecondsLeft } from "../hooks/useDuelSecondsLeft.ts";

export function DuelCountdown() {
  const secondsLeft = useDuelSecondsLeft();

  return (
    <p role="timer" aria-live="assertive">
      {secondsLeft === null ? "Get ready…" : `Starting in ${secondsLeft}…`}
    </p>
  );
}
