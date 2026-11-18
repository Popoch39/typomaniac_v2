import type { Result } from "@repo/typing-engine";

/** What a Duel means for one Participant. */
export type Outcome = "win" | "loss" | "draw";

/** The Outcome of the Participant whose Result is `own`, against the Opponent's Result. */
export function getOutcome(own: Result, opponent: Result): Outcome {
  if (own.wpm !== opponent.wpm) return own.wpm > opponent.wpm ? "win" : "loss";
  if (own.accuracy !== opponent.accuracy) return own.accuracy > opponent.accuracy ? "win" : "loss";
  return "draw";
}
