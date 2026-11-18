import { createFileRoute } from "@tanstack/react-router";
import { DuelScreen } from "../features/duel/components/DuelScreen.tsx";
import { useDuelStore } from "../features/duel/store/useDuelStore.ts";

export const Route = createFileRoute("/duel/$duelId")({
  // The socket follows the route rather than a component, since components may not run effects.
  onEnter: ({ params }) => useDuelStore.getState().join(params.duelId),
  onLeave: () => useDuelStore.getState().leave(),
  component: DuelScreen,
});
