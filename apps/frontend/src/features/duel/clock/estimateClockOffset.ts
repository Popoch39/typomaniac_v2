/** One ping/pong exchange: `sentAt` and `receivedAt` on the client's clock, `serverAt` on the server's. */
export type ClockSample = {
  readonly sentAt: number;
  readonly serverAt: number;
  readonly receivedAt: number;
};

/**
 * How far the server's clock is ahead of the client's, in milliseconds: a server instant minus the
 * offset is the same instant on the client's clock. The server is assumed to have answered halfway
 * through the round trip, which is the most likely the shorter the round trip, so the sample with
 * the shortest one is kept. `null` without any sample.
 */
export function estimateClockOffset(samples: readonly ClockSample[]) {
  const roundTrip = (sample: ClockSample) => sample.receivedAt - sample.sentAt;
  const best = samples.reduce<ClockSample | null>(
    (kept, sample) => (kept === null || roundTrip(sample) < roundTrip(kept) ? sample : kept),
    null,
  );
  if (best === null) return null;
  return best.serverAt - (best.sentAt + best.receivedAt) / 2;
}
