import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setChallengeDuelNavigation } from "./features/challenge/store/useChallengeStore.ts";
import { followSignedInPlayer } from "./features/online/session/followSignedInPlayer.ts";
import { setQueueDuelNavigation } from "./features/queue/store/useQueueStore.ts";
import "./index.css";
import { router } from "./router.ts";
import { queryClient } from "./shared/api/queryClient.ts";

followSignedInPlayer();
const goToDuel = (duelId: string) =>
  void router.navigate({ to: "/duel/$duelId", params: { duelId } });
setChallengeDuelNavigation(goToDuel);
setQueueDuelNavigation(goToDuel);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
