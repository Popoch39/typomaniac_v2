import { useOnlineStore } from "../store/useOnlineStore.ts";

/**
 * How many Players are Online, as the Player socket last told, or null while unknown. The last count
 * stays while the socket reconnects and goes blank once it is closed for good: a deliberate exception
 * to showing every error, since the count is ambient and no action of the Player's failed.
 */
export function useOnlinePlayers() {
  return useOnlineStore((state) => state.count);
}
