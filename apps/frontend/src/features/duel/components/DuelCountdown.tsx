import { useDuelSecondsLeft } from "../hooks/useDuelSecondsLeft.ts";

export function DuelCountdown() {
  const secondsLeft = useDuelSecondsLeft();
  // Nothing is shown until the clock is known, and at 0 the Round is starting: the line keeps its height.
  const shown = secondsLeft !== null && secondsLeft > 0 ? secondsLeft : null;

  return (
    <section className="flex grow items-center justify-center">
      <p
        role="timer"
        aria-live="assertive"
        className="m-0 min-h-lh font-display text-[clamp(120px,14vw,200px)] leading-none text-ink tabular-nums"
      >
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{shown === null ? "Get ready" : `Starting in ${shown}`}</span>
      </p>
    </section>
  );
}
