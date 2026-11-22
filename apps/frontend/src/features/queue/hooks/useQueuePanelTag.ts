import { useQueueStore } from "../store/useQueueStore.ts";

const TAGS = { queued: "In Queue", proposed: "Pairing", paired: "Pairing" } as const;

/** The tag of the Queue card: what the Queue is doing for the Player. */
export function useQueuePanelTag() {
  const kind = useQueueStore((state) => state.phase.kind);
  if (kind === "reconnecting") return "Reconnecting";
  return kind === "queued" || kind === "proposed" || kind === "paired" ? TAGS[kind] : "Best of 3";
}
