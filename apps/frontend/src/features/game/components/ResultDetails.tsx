import type { Result } from "@repo/typing-engine";
import { ResultStat } from "./ResultStat.tsx";

type ResultDetailsProps = {
  result: Result;
};

export function ResultDetails({ result }: ResultDetailsProps) {
  const { correct, incorrect, extra, missed } = result.charCounts;

  return (
    <dl className="result-details">
      <ResultStat label="Duration" value={`${result.duration}s`} />
      <ResultStat label="Correct" value={String(correct)} />
      <ResultStat label="Incorrect" value={String(incorrect)} />
      <ResultStat label="Extra" value={String(extra)} />
      <ResultStat label="Missed" value={String(missed)} />
    </dl>
  );
}
