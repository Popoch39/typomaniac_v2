import { useDuelCountdown } from "../hooks/useDuelCountdown.ts";

export function DuelCountdown() {
  const { shown, label } = useDuelCountdown();

  return (
    <section className="flex grow items-center justify-center">
      {/* The line keeps its height while no number shows. */}
      <p
        role="timer"
        aria-live="assertive"
        className="m-0 min-h-lh font-display text-[clamp(120px,14vw,200px)] leading-none text-ink tabular-nums"
      >
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{label}</span>
      </p>
    </section>
  );
}
