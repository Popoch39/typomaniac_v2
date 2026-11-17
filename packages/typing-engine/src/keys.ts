import type { Game, KeyPress } from "./game.ts";
import { roundTo2 } from "./numbers.ts";

// Monkeytype's own figure for a Game that ends with every key still held.
const DEFAULT_HOLD_MS = 80;

/** The presses a Result is read from: those made since the start, and the last one made before it. */
export function countedKeyPresses(game: Game, startedAt: number): readonly KeyPress[] {
  // The press that produces the first insertion comes just before the clock starts: it belongs to the Game.
  const lastBeforeStart = game.keyPresses.filter((press) => press.at < startedAt).at(-1);
  return game.keyPresses.filter((press) => press.at >= startedAt || press === lastBeforeStart);
}

/** Milliseconds each of `presses` was held, read against every hold of the Game. */
export function keyHoldDurations(
  game: Game,
  presses: readonly KeyPress[],
  startedAt: number,
): readonly number[] {
  const completeHolds = game.keyPresses
    .map((press) => (press.releasedAt ?? press.at) - press.at)
    .filter((duration) => duration > 0);
  const total = completeHolds.reduce((sum, duration) => sum + duration, 0);
  // A key still down at the end is given the usual hold of this Game rather than no duration at all.
  const estimate =
    completeHolds.length === 0 ? DEFAULT_HOLD_MS : roundTo2(total / completeHolds.length);

  return presses.map((press) => {
    const duration = press.releasedAt === null ? estimate : press.releasedAt - press.at;
    // A release that came before the start is outside the Game: the press is left without a duration.
    return press.at + duration < startedAt ? 0 : duration;
  });
}

/** Milliseconds from each press to the next one. */
export function keyPressGaps(presses: readonly KeyPress[], startedAt: number): readonly number[] {
  return presses.slice(1).map((press, index) => {
    const previousAt = presses[index]?.at ?? startedAt;
    // A press made before the start counts from the start, so the gaps add up to the time played.
    return press.at - Math.max(startedAt, previousAt);
  });
}
