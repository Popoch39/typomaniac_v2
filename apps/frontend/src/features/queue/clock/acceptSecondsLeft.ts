/** A Pairing's time to accept as the server told it, and when this client heard it. */
export type AcceptWindow = {
  /** The time that was left to accept when the server said so. */
  readonly acceptWithinMs: number;
  /** The instant this client received it, on its own clock. */
  readonly receivedAt: number;
};

/**
 * Whole seconds left to accept at `now`, on the client's clock, a second showing until it is fully
 * spent. Only the client's clock is read, so the gap with the server's never shows.
 */
export function acceptSecondsLeft({ acceptWithinMs, receivedAt }: AcceptWindow, now: number) {
  return Math.max(0, Math.ceil((acceptWithinMs - (now - receivedAt)) / 1000));
}
