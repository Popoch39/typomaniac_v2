import { useIsCurrentSection } from "../../shell/hooks/useIsCurrentSection.ts";
import { queueLayerContent } from "../layer/queueLayerContent.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

export function useQueueLayer() {
  const phase = useQueueStore((state) => state.phase);
  const isOnRankedPage = useIsCurrentSection("/ranked");
  return queueLayerContent({ phase, isOnRankedPage });
}
