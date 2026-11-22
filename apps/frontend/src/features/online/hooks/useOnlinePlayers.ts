import { onlineCountOf } from "../presence/onlinePresence.ts";
import { useOnlineStore } from "../store/useOnlineStore.ts";

/**
 * Where the Online count stands, and the count to show, `null` while unknown: the last count stays
 * through a first reopening and goes blank once the socket is closed for good, a deliberate exception
 * to showing every error, since the count is ambient and no action of the Player's failed.
 */
export function useOnlinePlayers() {
  const presence = useOnlineStore((state) => state.presence);
  return { kind: presence.kind, count: onlineCountOf(presence) };
}
