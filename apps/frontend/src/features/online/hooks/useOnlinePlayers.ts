import { useOnlineStore } from "../store/useOnlineStore.ts";

/**
 * How many Players are Online, as the Player socket last told, or null while unknown, and whether
 * the socket is down and retrying. The last count stays through a first reopening and goes blank
 * once the socket is closed for good: a deliberate exception to showing every error, since the count
 * is ambient and no action of the Player's failed.
 */
export function useOnlinePlayers() {
  const count = useOnlineStore((state) => state.count);
  const isDown = useOnlineStore((state) => state.isDown);
  return { count, isDown };
}
