import { useDuelEnd } from "../hooks/useDuelEnd.ts";
import { DuelResult } from "./DuelResult.tsx";

export function DuelEnd() {
  const end = useDuelEnd();
  if (end === null) return null;

  return (
    <section>
      <h2>{end.outcome}</h2>
      {/* Both Results side by side, the Participant's own first. */}
      <div className="grid grid-cols-2 gap-8">
        {end.sides.map(({ seat, name, result }) => (
          <DuelResult key={seat} name={name} result={result} />
        ))}
      </div>
    </section>
  );
}
