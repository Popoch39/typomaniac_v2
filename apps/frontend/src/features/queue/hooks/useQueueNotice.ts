import type { QueueRemovalReason } from "@repo/matchmaking-engine";
import { useQueueStore } from "../store/useQueueStore.ts";

const REPLACED = "The Queue continues in another tab. Enter it here to take your place back.";
const NOT_ACCEPTED =
  "You did not accept the Duel in time and left the Queue. Enter it again when you are ready.";
const CHALLENGED = "You accepted a Challenge and left the Queue for its Duel.";
const REMOVAL_NOTICES: Record<QueueRemovalReason, string> = {
  replaced: REPLACED,
  notAccepted: NOT_ACCEPTED,
  challenged: CHALLENGED,
};
const DISCONNECTED =
  "The connection was lost and you left the Queue. Enter it again to keep looking.";

/** What the Player must be told about why they are not queued here, if anything. */
export function useQueueNotice() {
  const phase = useQueueStore((state) => state.phase);
  if (phase.kind === "removed")
    return { role: "status", message: REMOVAL_NOTICES[phase.reason] } as const;
  if (phase.kind === "disconnected") return { role: "alert", message: DISCONNECTED } as const;
  if (phase.kind === "refused") return { role: "alert", message: phase.refusal } as const;
  return null;
}
