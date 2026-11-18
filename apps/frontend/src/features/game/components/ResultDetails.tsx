import type { Result } from "@repo/typing-engine";
import { useResultDetails } from "../hooks/useResultDetails.ts";
import { ResultStat } from "./ResultStat.tsx";

type ResultDetailsProps = {
  result: Result;
};

export function ResultDetails({ result }: ResultDetailsProps) {
  const { duration, correct, incorrect, extra, missed } = useResultDetails(result);

  return (
    <dl className="flex flex-wrap gap-12 [&_dd]:text-[24px]">
      <ResultStat label="Duration" value={duration} />
      <ResultStat label="Correct" value={correct} />
      <ResultStat label="Incorrect" value={incorrect} />
      <ResultStat label="Extra" value={extra} />
      <ResultStat label="Missed" value={missed} />
    </dl>
  );
}
