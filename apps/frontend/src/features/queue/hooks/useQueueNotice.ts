import { useQueueStore } from "../store/useQueueStore.ts";

const REPLACED = "The Queue continues in another tab. Enter it here to take your place back.";
const NOT_ACCEPTED =
  "You did not accept the Duel in time and left the Queue. Enter it again when you are ready.";
const CHALLENGED = "You accepted a Challenge and left the Queue for its Duel.";
const DISCONNECTED =
  "The connection was lost and you left the Queue. Enter it again to keep looking.";

/** What the Player must be told about why they are not queued here, if anything. */
export function useQueueNotice() {
  const phase = useQueueStore((state) => state.phase);
  const refusal = useQueueStore((state) => state.refusal);
  if (phase === "replaced") return { role: "status", message: REPLACED } as const;
  if (phase === "notAccepted") return { role: "status", message: NOT_ACCEPTED } as const;
  if (phase === "challenged") return { role: "status", message: CHALLENGED } as const;
  if (phase === "disconnected") return { role: "alert", message: DISCONNECTED } as const;
  if (phase === "refused" && refusal !== null) return { role: "alert", message: refusal } as const;
  return null;
}
