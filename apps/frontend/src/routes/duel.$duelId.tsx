import { createFileRoute } from "@tanstack/react-router";
import { DuelScreen } from "../features/duel/components/DuelScreen.tsx";
import { useDuelStore } from "../features/duel/store/useDuelStore.ts";
import { useQueueStore } from "../features/queue/store/useQueueStore.ts";

// Opening a Duel gives up the place in the Queue, so that no ranked Duel is proposed during it. Both
// accepted closed the Queue already: the way into a ranked Duel finds nothing to leave.
const leaveQueue = () => useQueueStore.getState().leaveForDuel();

export const Route = createFileRoute("/duel/$duelId")({
  // The socket follows the route rather than a component, since components may not run effects.
  onEnter: ({ params }) => {
    leaveQueue();
    useDuelStore.getState().join(params.duelId);
  },
  // Going from one Duel to another, as a new Custom Duel does from the end of one, stays on the route.
  onStay: ({ params }) => {
    leaveQueue();
    useDuelStore.getState().follow(params.duelId);
  },
  onLeave: () => useDuelStore.getState().leave(),
  component: DuelScreen,
});
