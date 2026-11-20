import { disconnectionMessage } from "../disconnection/disconnectionMessage.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

export function useDuelDisconnectionMessage() {
  const closeReason = useDuelStore((state) => state.closeReason);
  return disconnectionMessage(closeReason ?? "");
}
