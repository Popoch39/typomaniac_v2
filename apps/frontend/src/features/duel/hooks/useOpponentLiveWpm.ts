import { getLiveStats } from "@repo/typing-engine";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/**
 * The Opponent's live WPM, read as much time after their start as has passed since the
 * Participant's own: both Games started at the same real instant, on two different clocks.
 */
export function useOpponentLiveWpm() {
  const opponentGame = useDuelStore((state) => state.opponentGame);
  const startedAt = useGameStore((state) => state.game.startedAt);
  const readAt = useGameStore((state) => state.readAt);
  if (opponentGame?.startedAt == null || startedAt === null) return 0;
  return getLiveStats(opponentGame, opponentGame.startedAt + (readAt - startedAt)).wpm;
}
