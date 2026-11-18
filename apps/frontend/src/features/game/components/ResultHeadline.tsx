import type { Result } from "@repo/typing-engine";
import { useResultHeadline } from "../hooks/useResultHeadline.ts";
import { ResultStat } from "./ResultStat.tsx";

type ResultHeadlineProps = {
  result: Result;
};

export function ResultHeadline({ result }: ResultHeadlineProps) {
  const { wpm, rawWpm, accuracy, consistency } = useResultHeadline(result);

  return (
    <dl className="flex flex-wrap gap-12 [&_dd]:text-[48px]">
      <ResultStat label="WPM" value={wpm} />
      <ResultStat label="Raw WPM" value={rawWpm} />
      <ResultStat label="Accuracy" value={accuracy} />
      <ResultStat label="Consistency" value={consistency} />
    </dl>
  );
}
