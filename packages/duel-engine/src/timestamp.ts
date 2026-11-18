import type { GameEvent } from "@repo/typing-engine";
import { DUEL_GAME_CONFIG, TIMESTAMP_TOLERANCE_MS } from "./constants.ts";

/**
 * The server instant a Game's `start` is anchored at, from the instant the server received it and
 * the announced Start. The earlier of the two, so that a `start` sent early gains no typing time.
 */
export const anchorStart = (receivedAt: number, startAt: number) => Math.min(receivedAt, startAt);

/**
 * What maps the two clocks of a Game without comparing them: its `start` as its client stamped it,
 * the server instant that `start` is anchored at, and the server instant an Event was received.
 */
export type Receipt = {
  readonly startedAt: number;
  readonly anchorAt: number;
  readonly receivedAt: number;
};

/**
 * The Event as the server takes it. One stamped more than the tolerance behind its receipt, in
 * time elapsed since the `start` on each side, keeps its content and has its timestamp moved up to
 * that bound; any other is returned as it is, a timestamp ahead of its receipt included.
 */
export const boundEvent = (
  event: GameEvent,
  { startedAt, anchorAt, receivedAt }: Receipt,
): GameEvent => {
  if (event.type === "addWords") return event;
  const bound = startedAt + (receivedAt - anchorAt) - TIMESTAMP_TOLERANCE_MS;
  return event.at >= bound ? event : { ...event, at: bound };
};

/**
 * The instant of the final Tick the server applies to a Game whose client went silent: 30 seconds
 * after its start, and no earlier than the last Event of its journal.
 */
export const finalTickAt = (startedAt: number, journal: readonly GameEvent[]) =>
  journal.reduce(
    (latest, event) => (event.type === "addWords" ? latest : Math.max(latest, event.at)),
    startedAt + DUEL_GAME_CONFIG.seconds * 1000,
  );
