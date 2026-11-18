import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./shared/api/queryClient.ts";
import { RouteError } from "./shared/components/RouteError.tsx";
import { RouteNotFound } from "./shared/components/RouteNotFound.tsx";

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Query owns the cache and its staleness: the router must always call loaders on preload.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
