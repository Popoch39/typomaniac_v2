import { useQueueStore } from "../store/useQueueStore.ts";

const TAGS = { queued: "In Queue", proposed: "Pairing", paired: "Pairing" } as const;

/** The tag of the Queue card: what the Queue is doing for the Player. */
export function useQueuePanelTag() {
  const phase = useQueueStore((state) => state.phase);
  const isReconnecting = useQueueStore((state) => state.isReconnecting);
  if (isReconnecting) return "Reconnecting";
  return phase === "queued" || phase === "proposed" || phase === "paired"
    ? TAGS[phase]
    : "Best of 3";
}
