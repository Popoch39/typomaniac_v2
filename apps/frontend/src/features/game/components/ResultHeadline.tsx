import type { Result } from "@repo/typing-engine";
import { ResultStat } from "./ResultStat.tsx";

type ResultHeadlineProps = {
  result: Result;
};

export function ResultHeadline({ result }: ResultHeadlineProps) {
  return (
    <dl className="result-headline">
      <ResultStat label="WPM" value={String(result.wpm)} />
      <ResultStat label="Raw WPM" value={String(result.rawWpm)} />
      <ResultStat label="Accuracy" value={`${result.accuracy}%`} />
      <ResultStat label="Consistency" value={`${result.consistency}%`} />
    </dl>
  );
}
