import type { Result } from "@repo/typing-engine";

export function useResultHeadline(result: Result) {
  return {
    wpm: String(result.wpm),
    rawWpm: String(result.rawWpm),
    accuracy: `${result.accuracy}%`,
    consistency: `${result.consistency}%`,
  };
}
