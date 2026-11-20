import type { ReplayTimeline } from "./replayTimeline.ts";

/** One KeyPress as the replay draws it, its ends as shares of the window shown, from 0 to 1. */
export type KeyPressBar = {
  readonly code: string;
  /** The row it is drawn on: a key still down when the next goes down pushes that one a row lower. */
  readonly lane: number;
  readonly from: number;
  readonly to: number;
  /** Still down at the instant shown. */
  readonly held: boolean;
};

/**
 * The KeyPresses seen in the `windowMs` milliseconds before `position`, each from the instant its key
 * went down to the instant it was released, so that hold times and overlapping keys show. A key not
 * released by then is drawn up to `position`; one never released is held until the end of the replay.
 */
export function keyPressBars(
  { keyPresses, duration }: ReplayTimeline,
  position: number,
  windowMs: number,
): KeyPressBar[] {
  const windowStart = position - windowMs;
  const share = (at: number) => Math.min(1, Math.max(0, (at - windowStart) / windowMs));
  // Each lane is free again from the release of its last KeyPress.
  const laneEnds: number[] = [];
  const bars: KeyPressBar[] = [];
  for (const { at, code, releasedAt } of keyPresses) {
    const releasedAtEnd = releasedAt ?? duration;
    const free = laneEnds.findIndex((end) => end <= at);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = releasedAtEnd;
    const shownEnd = Math.min(releasedAtEnd, position);
    if (at > position || shownEnd < windowStart) continue;
    bars.push({
      code,
      lane,
      from: share(at),
      to: share(shownEnd),
      held: releasedAt === null || releasedAt > position,
    });
  }
  return bars;
}
