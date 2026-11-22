import type { SocketLink } from "../../../shared/link/socketLink.ts";

/** Where the Online count stands for this tab, as its Player socket tells it. */
export type OnlinePresence =
  /** No Player socket: a Guest, or before the Player is known. */
  | { readonly kind: "guest" }
  /** The Player socket is opening, or closed for good: the count is unknown and stays blank. */
  | { readonly kind: "connecting"; readonly playerId: string }
  | { readonly kind: "live"; readonly playerId: string; readonly count: number }
  /** The Player socket dropped and could not be reopened yet: `lastCount` is stale until it is. */
  | { readonly kind: "down"; readonly playerId: string; readonly lastCount: number | null };

export type OnlinePresenceEvent =
  /** The signed-in Player, `null` for a Guest. */
  | { readonly kind: "follow"; readonly playerId: string | null; readonly socketUrl: string }
  | { readonly kind: "count"; readonly count: number }
  | { readonly kind: "link"; readonly link: SocketLink };

/** `close` closes the Player socket, `open` opens it at `url` in place of any other. */
export type OnlinePresenceEffect =
  | { readonly kind: "close" }
  | { readonly kind: "open"; readonly url: string };

export const GUEST_PRESENCE: OnlinePresence = { kind: "guest" };

/** How many Players are Online, as the Player socket last told, `null` while unknown. */
export function onlineCountOf(presence: OnlinePresence) {
  if (presence.kind === "live") return presence.count;
  if (presence.kind === "down") return presence.lastCount;
  return null;
}

function nextOfLink(presence: OnlinePresence, link: SocketLink): OnlinePresence {
  if (presence.kind === "guest") return presence;
  const { playerId } = presence;
  // Nothing is shown of a refusal or a closing for good: the count is ambient, and no action of the
  // Player's failed.
  if (link.kind === "refused" || link.kind === "down") return { kind: "connecting", playerId };
  // The count stays shown through the first reopening, so that a server restart does not blank it.
  if (link.kind === "backoff" && link.attempt > 1 && presence.kind !== "down")
    return { kind: "down", playerId, lastCount: onlineCountOf(presence) };
  return presence;
}

export function nextOnlinePresence(
  presence: OnlinePresence,
  event: OnlinePresenceEvent,
): { readonly presence: OnlinePresence; readonly effects: readonly OnlinePresenceEffect[] } {
  switch (event.kind) {
    case "follow": {
      const { playerId } = event;
      if (playerId === (presence.kind === "guest" ? null : presence.playerId))
        return { presence, effects: [] };
      if (playerId === null) return { presence: GUEST_PRESENCE, effects: [{ kind: "close" }] };
      return {
        presence: { kind: "connecting", playerId },
        effects: [{ kind: "close" }, { kind: "open", url: event.socketUrl }],
      };
    }
    case "count":
      return {
        presence:
          presence.kind === "guest"
            ? presence
            : { kind: "live", playerId: presence.playerId, count: event.count },
        effects: [],
      };
    case "link":
      return { presence: nextOfLink(presence, event.link), effects: [] };
  }
}
