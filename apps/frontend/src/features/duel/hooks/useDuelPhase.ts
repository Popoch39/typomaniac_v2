import { broadcastPhase, shownPhase } from "../phase/duelPhase.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** The phase the Duel screen shows and, when it is one, the phase of its Broadcast. */
export function useDuelPhase() {
  const phase = useDuelStore((state) => shownPhase(state.lifecycle));
  return { phase, broadcast: broadcastPhase(phase.kind) };
}
