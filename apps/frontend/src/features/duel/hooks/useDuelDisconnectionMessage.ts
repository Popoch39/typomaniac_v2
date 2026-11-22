import { disconnectionMessage } from "../disconnection/disconnectionMessage.ts";

export function useDuelDisconnectionMessage(closeReason: string) {
  return disconnectionMessage(closeReason);
}
