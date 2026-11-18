import type { Result } from "@repo/typing-engine";
import { ResultDetails } from "../../game/components/ResultDetails.tsx";
import { ResultHeadline } from "../../game/components/ResultHeadline.tsx";

type DuelResultProps = {
  name: string;
  result: Result;
};

export function DuelResult({ name, result }: DuelResultProps) {
  return (
    <section className="flex flex-col gap-8">
      <h3 className="text-[1.17em] font-bold text-foreground">{name}</h3>
      <ResultHeadline result={result} />
      <ResultDetails result={result} />
    </section>
  );
}
