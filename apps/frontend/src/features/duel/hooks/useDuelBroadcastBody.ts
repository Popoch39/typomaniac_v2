import type { BroadcastPhase } from "../phase/duelPhase.ts";
import { broadcastBody } from "../phase/broadcastBody.ts";
import { useDuelTitle } from "./useDuelTitle.ts";

export function useDuelBroadcastBody(phase: BroadcastPhase) {
  return broadcastBody(phase, useDuelTitle() !== null);
}
