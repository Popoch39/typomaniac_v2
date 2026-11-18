import type { Result } from "@repo/typing-engine";
import { ResultDetails } from "../../game/components/ResultDetails.tsx";
import { ResultHeadline } from "../../game/components/ResultHeadline.tsx";

type DuelResultProps = {
  name: string;
  result: Result;
};

export function DuelResult({ name, result }: DuelResultProps) {
  return (
    <section className="result-panel">
      <h3>{name}</h3>
      <ResultHeadline result={result} />
      <ResultDetails result={result} />
    </section>
  );
}
