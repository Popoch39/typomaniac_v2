import { useDuelNextRound } from "../hooks/useDuelNextRound.ts";

export function DuelNextRound() {
  const next = useDuelNextRound();

  return (
    <p
      role="timer"
      aria-live="polite"
      className="m-0 min-h-lh font-display text-[56px] leading-none text-ink tabular-nums"
    >
      {next}
    </p>
  );
}
