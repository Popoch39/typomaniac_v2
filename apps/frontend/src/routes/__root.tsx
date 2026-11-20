import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { OnlineHeartbeat } from "../features/online/components/OnlineHeartbeat.tsx";
import { RootLayout } from "../shared/components/RootLayout.tsx";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // The heartbeat sits at the root, outside the shell, so that a Player in a Duel stays Online.
  component: () => (
    <>
      <OnlineHeartbeat />
      <RootLayout />
    </>
  ),
});
