import { useDuelEnd } from "../hooks/useDuelEnd.ts";
import { DuelResult } from "./DuelResult.tsx";

export function DuelEnd() {
  const end = useDuelEnd();
  if (end === null) return null;

  return (
    <section className="duel-end">
      <h2 className="duel-outcome">{end.outcome}</h2>
      <div className="duel-results">
        {end.sides.map(({ seat, name, result }) => (
          <DuelResult key={seat} name={name} result={result} />
        ))}
      </div>
    </section>
  );
}
