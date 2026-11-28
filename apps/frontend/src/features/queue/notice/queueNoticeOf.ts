import type { QueueRemovalReason } from "@repo/matchmaking-engine";
import type { QueueNoticePhase } from "../phase/queuePhase.ts";

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

/**
 * Why the Player is not queued, in the words the Queue panel and the toast both use. A removal the
 * Player brought about is a status; a lost connection or a refusal stops them, so it is an alert.
 */
export function queueNoticeOf(phase: QueueNoticePhase) {
  switch (phase.kind) {
    case "removed":
      return { role: "status", message: REMOVAL_NOTICES[phase.reason] } as const;
    case "disconnected":
      return { role: "alert", message: DISCONNECTED } as const;
    case "refused":
      return { role: "alert", message: phase.refusal } as const;
  }
}
