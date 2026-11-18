/**
 * How far ahead of this client's clock the Events of a Game must be stamped. A Game the server
 * started for an absent Participant runs on the server's clock, at exactly the announced Start:
 * its Events are stamped in server time, through the clock offset, so that a client whose clock is
 * honestly off is not seen as late. A Game the Participant started runs on their own clock.
 * `null` while a Game on the server's clock still waits for the clock offset.
 */
export function eventClockShift({
  gameStartedAt,
  startAt,
  clockOffset,
}: {
  /** The timestamp of the Game's `start` Event. */
  readonly gameStartedAt: number;
  /** The announced Start, in server time. */
  readonly startAt: number;
  readonly clockOffset: number | null;
}) {
  return gameStartedAt === startAt ? clockOffset : 0;
}
