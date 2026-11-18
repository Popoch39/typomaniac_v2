import { getLiveStats } from "@repo/typing-engine";
import { useGameStore } from "../store/useGameStore.ts";

export function useLiveStats() {
  const game = useGameStore((state) => state.game);
  const readAt = useGameStore((state) => state.readAt);
  return getLiveStats(game, readAt);
}
