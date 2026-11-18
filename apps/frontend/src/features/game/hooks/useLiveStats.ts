import { getLiveStats } from "@repo/typing-engine";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "../store/useGameStore.ts";

/** Compared by value, so key presses that leave the displayed stats unchanged do not re-render. */
export function useLiveStats() {
  return useGameStore(useShallow((state) => getLiveStats(state.game, state.readAt)));
}
