import { formatClock } from "../../../shared/lib/formatClock.ts";
import type { Countdown } from "./countdown.ts";

/** The time until the Start of Round `round`, in words, as far as the Countdown knows it. */
export function nextRoundLabel(round: number, countdown: Countdown) {
  const next = `Round ${round}`;
  if (countdown.kind === "counting") return `${next} in ${formatClock(countdown.secondsLeft)}`;
  // The Start is announced: only the clock offset that places it is missing.
  if (countdown.kind === "awaitingOffset") return `${next} starting`;
  return `${next} soon`;
}
