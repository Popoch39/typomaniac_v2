import type { signalRows } from "../review/signalRows.ts";

interface ReviewGameProps {
  game: { round: number; outcome: string; signals: ReturnType<typeof signalRows> };
}

/** One Game of a reviewed Duel, each signal with its name and value. */
export function ReviewGame({ game: { round, outcome, signals } }: ReviewGameProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-ink-subtle">
        Round {round}: {outcome}
      </p>
      {signals.length === 0 ? (
        <p className="m-0 text-ink-muted">Not analysed yet.</p>
      ) : (
        <dl className="m-0 grid grid-cols-[1fr_max-content] gap-x-6 gap-y-1">
          {signals.map(({ name, label, value }) => (
            <div key={name} className="contents">
              <dt title={name}>
                {label} <span className="type-mono-sm text-ink-subtle">{name}</span>
              </dt>
              <dd className="m-0 text-right type-mono-sm">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
