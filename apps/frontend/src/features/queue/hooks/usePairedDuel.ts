import { useQueueStore } from "../store/useQueueStore.ts";

/** The ranked Duel both Players accepted, `null` until then. */
export function usePairedDuel() {
  return useQueueStore((state) => (state.phase.kind === "paired" ? state.phase.duelId : null));
}
