import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setChallengeDuelNavigation } from "./features/challenge/store/useChallengeStore.ts";
import { followSignedInPlayer } from "./features/online/store/followSignedInPlayer.ts";
import "./index.css";
import { router } from "./router.ts";
import { queryClient } from "./shared/api/queryClient.ts";

followSignedInPlayer();
setChallengeDuelNavigation(
  (duelId) => void router.navigate({ to: "/duel/$duelId", params: { duelId } }),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
