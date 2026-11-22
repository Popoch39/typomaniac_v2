import { hashKey } from "@tanstack/react-query";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { useOnlineStore } from "./useOnlineStore.ts";

/**
 * Keeps the Player socket open for as long as a Player is signed in, on every page, Duels included:
 * follows the signed-in Player wherever the app reads them, without reading them itself.
 */
export function followSignedInPlayer() {
  const { queryKey } = meQueryOptions();
  const meHash = hashKey(queryKey);
  queryClient.getQueryCache().subscribe(({ query }) => {
    if (query.queryHash !== meHash) return;
    useOnlineStore.getState().follow(queryClient.getQueryData(queryKey)?.id ?? null);
  });
}
