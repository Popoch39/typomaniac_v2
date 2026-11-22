import { useDuelStore } from "../store/useDuelStore.ts";

/** Whether the socket dropped and the server has not answered its reopening yet. */
export function useDuelReconnecting() {
  return useDuelStore((state) => state.lifecycle.kind === "reconnecting");
}
