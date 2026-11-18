/** The Player's entry in the Queue as the server told it, and when this client heard it. */
export type QueueEntry = {
  /** The instant of entry, in server time. */
  readonly queuedAt: number;
  /** The instant the server said so, in server time. */
  readonly serverAt: number;
  /** The instant this client received it, on its own clock. */
  readonly receivedAt: number;
};

/**
 * Whole seconds the Player has waited at `now`, on the client's clock. Each clock is only compared
 * with itself, so the gap between the two never shows.
 */
export function waitingSeconds({ queuedAt, serverAt, receivedAt }: QueueEntry, now: number) {
  return Math.max(0, Math.floor((serverAt - queuedAt + (now - receivedAt)) / 1000));
}

export function formatWaitingTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
