import type { BroadcastPhase } from "./duelPhase.ts";

export type BroadcastBody = "countdown" | "live" | "roundEnd" | "duelEnd";

/**
 * What the Broadcast screen shows under its band. The deciding Round's end already shows the
 * Duel's, `isDecided`, so the server ending the Duel moves nothing.
 */
export function broadcastBody(phase: BroadcastPhase, isDecided: boolean): BroadcastBody {
  if (phase === "countdown") return "countdown";
  if (phase === "running") return "live";
  return phase === "roundEnd" && !isDecided ? "roundEnd" : "duelEnd";
}
