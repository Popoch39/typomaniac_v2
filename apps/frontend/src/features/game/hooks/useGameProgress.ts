import { useGameStore } from "../store/useGameStore.ts";

/** The seconds remaining in a `time` Game, or the words typed out of the total in a `words` Game. */
export function useGameProgress() {
  const config = useGameStore((state) => state.game.config);
  const startedAt = useGameStore((state) => state.game.startedAt);
  const typedWords = useGameStore((state) => state.game.activeWordIndex);
  const readAt = useGameStore((state) => state.readAt);

  if (config.mode === "words") return `${typedWords}/${config.wordCount}`;
  // Rounded rather than floored: Ticks can fire a few milliseconds early or late.
  const elapsedSeconds = startedAt === null ? 0 : Math.round((readAt - startedAt) / 1000);
  return String(Math.max(0, config.seconds - elapsedSeconds));
}
