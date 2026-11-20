import { formatInstant } from "./formatInstant.ts";

/** A Report against the reviewed Player, on one line: who made it, on which Duel, and when. */
export function reportLine(
  {
    duelId,
    reporterNickname,
    reportedAt,
  }: { duelId: string; reporterNickname: string | null; reportedAt: number },
  timeZone?: string,
) {
  // The start of the id is enough to tell the Duel among the reviewed Player's recent ones.
  return `By ${reporterNickname ?? "a Player"}, on Duel ${duelId.slice(0, 8)}, ${formatInstant(reportedAt, timeZone)}`;
}
