import { hashKey } from "@tanstack/react-query";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { useOnlineStore } from "./useOnlineStore.ts";

const socketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/online/socket`;
};

/**
 * Keeps the Player socket open for as long as a Player is signed in, on every page, Duels included:
 * follows the signed-in Player wherever the app reads them, without reading them itself. A dropped
 * socket is retried at once when the browser has its network back or the tab is seen again.
 */
export function followSignedInPlayer() {
  const retry = () => useOnlineStore.getState().retry();
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retry();
  });
  const { queryKey } = meQueryOptions();
  const meHash = hashKey(queryKey);
  queryClient.getQueryCache().subscribe(({ query }) => {
    if (query.queryHash !== meHash) return;
    useOnlineStore.getState().follow(queryClient.getQueryData(queryKey)?.id ?? null, socketUrl());
  });
}
