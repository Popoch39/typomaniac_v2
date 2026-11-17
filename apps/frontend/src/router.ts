import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const queryClient = new QueryClient();

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Query owns the cache and its staleness: the router must always call loaders on preload.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
