import type { Result } from "@repo/typing-engine";
import { ResultDetails } from "../../game/components/ResultDetails.tsx";
import { ResultHeadline } from "../../game/components/ResultHeadline.tsx";
import { ResultStat } from "../../game/components/ResultStat.tsx";

type DuelResultProps = {
  name: string;
  result: Result;
  points: number;
};

export function DuelResult({ name, result, points }: DuelResultProps) {
  return (
    <section className="flex flex-col gap-8">
      <h3 className="text-[1.17em] font-bold text-foreground">{name}</h3>
      <dl className="[&_dd]:text-[64px]">
        <ResultStat label="Points" value={String(points)} />
      </dl>
      <ResultHeadline result={result} />
      <ResultDetails result={result} />
    </section>
  );
}
