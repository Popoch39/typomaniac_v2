import type { SocketLink } from "../../../shared/link/socketLink.ts";
import type { PlayerServerMessage } from "../message/parsePlayerMessage.ts";

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
  | { readonly kind: "receive"; readonly message: PlayerServerMessage }
  | { readonly kind: "link"; readonly link: SocketLink };

/**
 * `close` closes the Player socket, `open` opens it at `url` in place of any other. `relay` hands a
 * message about Friends or Challenges to their stores, `refreshFriendReads` reads the Friends and
 * Friend requests again. `forget` drops the Friends' states and the Challenges of the Player followed
 * before, `giveUp` tells that none can be told any more, and `dropChallenges` that the server
 * cancelled the Challenge this tab sent, the socket having dropped.
 */
export type OnlinePresenceEffect =
  | { readonly kind: "close" }
  | { readonly kind: "open"; readonly url: string }
  | { readonly kind: "relay"; readonly message: PlayerServerMessage }
  | { readonly kind: "refreshFriendReads" }
  | { readonly kind: "forget" }
  | { readonly kind: "giveUp" }
  | { readonly kind: "dropChallenges" };

export const GUEST_PRESENCE: OnlinePresence = { kind: "guest" };

/** How many Players are Online, as the Player socket last told, `null` while unknown. */
export function onlineCountOf(presence: OnlinePresence) {
  if (presence.kind === "live") return presence.count;
  if (presence.kind === "down") return presence.lastCount;
  return null;
}

// The Friends and Friend requests read again when the socket says they changed, and when it tells
// the Friends' states on opening, since a reconnection may have missed a change.
const changesFriendReads = (message: PlayerServerMessage) =>
  message.type !== "onlineCount" &&
  message.type !== "friendState" &&
  !message.type.startsWith("challenge");

type OnlinePresenceTransition = {
  readonly presence: OnlinePresence;
  readonly effects: readonly OnlinePresenceEffect[];
};

function nextOfLink(presence: OnlinePresence, link: SocketLink): OnlinePresenceTransition {
  if (presence.kind === "guest") return { presence, effects: [] };
  const { playerId } = presence;
  // Nothing is shown of a refusal or a closing for good: the count is ambient, and no action of the
  // Player's failed.
  if (link.kind === "refused" || link.kind === "down")
    return { presence: { kind: "connecting", playerId }, effects: [{ kind: "giveUp" }] };
  if (link.kind !== "backoff") return { presence, effects: [] };
  const effects = [{ kind: "dropChallenges" } as const];
  // The count stays shown through the first reopening, so that a server restart does not blank it.
  if (link.attempt > 1 && presence.kind !== "down")
    return { presence: { kind: "down", playerId, lastCount: onlineCountOf(presence) }, effects };
  return { presence, effects };
}

function nextOfMessage(
  presence: OnlinePresence,
  message: PlayerServerMessage,
): OnlinePresenceTransition {
  if (presence.kind === "guest") return { presence, effects: [] };
  if (message.type === "onlineCount")
    return {
      presence: { kind: "live", playerId: presence.playerId, count: message.count },
      effects: [],
    };
  return {
    presence,
    effects: [
      { kind: "relay", message },
      ...(changesFriendReads(message) ? [{ kind: "refreshFriendReads" } as const] : []),
    ],
  };
}

export function nextOnlinePresence(
  presence: OnlinePresence,
  event: OnlinePresenceEvent,
): OnlinePresenceTransition {
  switch (event.kind) {
    case "follow": {
      const { playerId } = event;
      if (playerId === (presence.kind === "guest" ? null : presence.playerId))
        return { presence, effects: [] };
      if (playerId === null)
        return { presence: GUEST_PRESENCE, effects: [{ kind: "close" }, { kind: "forget" }] };
      return {
        presence: { kind: "connecting", playerId },
        effects: [{ kind: "close" }, { kind: "forget" }, { kind: "open", url: event.socketUrl }],
      };
    }
    case "receive":
      return nextOfMessage(presence, event.message);
    case "link":
      return nextOfLink(presence, event.link);
  }
}
