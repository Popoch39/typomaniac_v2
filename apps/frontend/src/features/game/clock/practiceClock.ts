import type { Game } from "@repo/typing-engine";

/** The Tick and read timers of the Game store: they run exactly while its Game runs, unfrozen. */
export type PracticeClock =
  | { readonly kind: "idle" }
  // The start it ticks from: a Game loaded with another start needs its Ticks counted from that one.
  | { readonly kind: "ticking"; readonly startedAt: number };

/** `start` (re)starts the timers from now, `stop` clears them. */
export type PracticeClockEffect = "start" | "stop" | null;

export function nextPracticeClock(
  clock: PracticeClock,
  game: Game,
  isFrozen: boolean,
): { readonly clock: PracticeClock; readonly effect: PracticeClockEffect } {
  if (isFrozen || game.status !== "running" || game.startedAt === null) {
    return { clock: { kind: "idle" }, effect: clock.kind === "ticking" ? "stop" : null };
  }
  if (clock.kind === "ticking" && clock.startedAt === game.startedAt)
    return { clock, effect: null };
  return { clock: { kind: "ticking", startedAt: game.startedAt }, effect: "start" };
}
