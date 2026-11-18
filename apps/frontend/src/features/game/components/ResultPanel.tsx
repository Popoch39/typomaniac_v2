import { useResult } from "../hooks/useResult.ts";
import { ResultDetails } from "./ResultDetails.tsx";
import { ResultHeadline } from "./ResultHeadline.tsx";
import { ResultJson } from "./ResultJson.tsx";

export function ResultPanel() {
  const result = useResult();

  return (
    <section className="flex flex-col gap-8">
      <ResultHeadline result={result} />
      <ResultDetails result={result} />
      <ResultJson result={result} />
    </section>
  );
}
