import { useGameStore } from "../store/useGameStore.ts";

/** The seconds remaining in a `time` Game, or the words typed out of the total in a `words` Game. */
export function useGameProgress() {
  // A single string, so a word change in a `time` Game, which does not show it, re-renders nothing.
  return useGameStore((state) => {
    const { config, startedAt, activeWordIndex } = state.game;
    if (config.mode === "words") return `${activeWordIndex}/${config.wordCount}`;
    // Rounded rather than floored: Ticks can fire a few milliseconds early or late.
    const elapsedSeconds = startedAt === null ? 0 : Math.round((state.readAt - startedAt) / 1000);
    return String(Math.max(0, config.seconds - elapsedSeconds));
  });
}
