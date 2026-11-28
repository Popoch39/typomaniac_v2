import { useGameStore } from "../../game/store/useGameStore.ts";
import { useIsCurrentSection } from "../../shell/hooks/useIsCurrentSection.ts";
import { queueLayerContent } from "../layer/queueLayerContent.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

export function useQueueLayer() {
  const phase = useQueueStore((state) => state.phase);
  const isOnRankedPage = useIsCurrentSection("/ranked");
  // The Game store also plays the Duels, which a queued Player never has open: only Practice counts.
  const isOnPracticePage = useIsCurrentSection("/practice");
  const isGameRunning = useGameStore((state) => state.game.status === "running");
  return queueLayerContent({
    phase,
    isOnRankedPage,
    isPracticeGameRunning: isOnPracticePage && isGameRunning,
  });
}
