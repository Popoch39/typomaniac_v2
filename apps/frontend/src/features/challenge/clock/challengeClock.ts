import { formatClock } from "../../../shared/lib/formatClock.ts";

/** A Challenge's time to answer as the server told it, and when this client heard it. */
export type AnswerWindow = {
  /** The time that was left to answer when the server said so. */
  readonly answerWithinMs: number;
  /** The instant this client received it, on its own clock. */
  readonly receivedAt: number;
};

/**
 * The time left to answer at `now`, on the client's clock, as a clock with a second showing until it
 * is fully spent, and as the share of the time there was. Only the client's clock is read, so the gap
 * with the server's never shows.
 */
export function challengeTimeLeft({ answerWithinMs, receivedAt }: AnswerWindow, now: number) {
  const seconds = Math.max(0, Math.ceil((answerWithinMs - (now - receivedAt)) / 1000));
  const allSeconds = Math.ceil(answerWithinMs / 1000);
  return { label: formatClock(seconds), share: allSeconds === 0 ? 0 : seconds / allSeconds };
}
