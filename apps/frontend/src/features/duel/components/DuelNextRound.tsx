import { useDuelNextRound } from "../hooks/useDuelNextRound.ts";

export function DuelNextRound() {
  const next = useDuelNextRound();

  return (
    <p role="timer" aria-live="polite">
      {next}
    </p>
  );
}
