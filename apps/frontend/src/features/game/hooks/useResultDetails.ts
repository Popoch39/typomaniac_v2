import type { Result } from "@repo/typing-engine";

export function useResultDetails(result: Result) {
  const { correct, incorrect, extra, missed } = result.charCounts;
  return {
    duration: `${result.duration}s`,
    correct: String(correct),
    incorrect: String(incorrect),
    extra: String(extra),
    missed: String(missed),
  };
}
