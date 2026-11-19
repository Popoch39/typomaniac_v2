import { useGameStore } from "../store/useGameStore.ts";

// Ticks can fire a few milliseconds early: one that does still counts its whole second.
const EARLY_TICK_TOLERANCE_MS = 50;

/** The seconds remaining in a `time` Game, or the words typed out of the total in a `words` Game. */
export function useGameProgress() {
  // A single string, so a word change in a `time` Game, which does not show it, re-renders nothing.
  return useGameStore((state) => {
    const { config, startedAt, activeWordIndex } = state.game;
    if (config.mode === "words") return `${activeWordIndex}/${config.wordCount}`;
    // Floored, as the Live stats are also read between Ticks: a second counts once it has passed.
    const elapsedSeconds =
      startedAt === null
        ? 0
        : Math.floor((state.readAt - startedAt + EARLY_TICK_TOLERANCE_MS) / 1000);
    return String(Math.max(0, config.seconds - elapsedSeconds));
  });
}
