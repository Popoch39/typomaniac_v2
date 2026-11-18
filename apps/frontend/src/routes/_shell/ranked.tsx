import { createFileRoute } from "@tanstack/react-router";
import { useQueueStore } from "../../features/queue/store/useQueueStore.ts";
import { RankedPage } from "../../features/ranked/components/RankedPage.tsx";

export const Route = createFileRoute("/_shell/ranked")({
  // The Queue socket lives with the page: leaving the route leaves the Queue.
  onLeave: () => useQueueStore.getState().leave(),
  component: RankedPage,
});
