import type { Result } from "@repo/typing-engine";
import { DuelResult } from "./DuelResult.tsx";

type DuelRoundResultsProps = {
  title: string;
  sides: readonly { seat: number; name: string; result: Result; points: number }[];
};

export function DuelRoundResults({ title, sides }: DuelRoundResultsProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2>{title}</h2>
      {/* Both Results side by side, the Participant's own first. */}
      <div className="grid grid-cols-2 gap-8">
        {sides.map(({ seat, name, result, points }) => (
          <DuelResult key={seat} name={name} result={result} points={points} />
        ))}
      </div>
    </section>
  );
}
