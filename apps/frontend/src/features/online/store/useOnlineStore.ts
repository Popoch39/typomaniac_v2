import { create } from "zustand";
import {
  GUEST_PRESENCE,
  type OnlinePresence,
  type OnlinePresenceEvent,
  nextOnlinePresence,
  onlineCountOf,
} from "../presence/onlinePresence.ts";
import { closePlayerSocket, openPlayerSocket, retryPlayerSocket } from "../socket/playerSocket.ts";

type OnlineState = {
  readonly presence: OnlinePresence;
  /** How many Players are Online, as the Player socket last told, or `null` while unknown. */
  readonly count: number | null;
  /** The Player socket dropped and could not be reopened yet: `count` is stale until it is. */
  readonly isDown: boolean;
  /** Opens the Player socket at `socketUrl` for a signed-in Player, or closes it for a Guest. */
  readonly follow: (playerId: string | null, socketUrl: string) => void;
  /** Tries to reopen a dropped Player socket now, as when the browser may have its network back. */
  readonly retry: () => void;
};

export const useOnlineStore = create<OnlineState>()((set, get) => {
  const dispatch = (event: OnlinePresenceEvent) => {
    const { presence, effects } = nextOnlinePresence(get().presence, event);
    set({ presence, count: onlineCountOf(presence), isDown: presence.kind === "down" });
    for (const effect of effects) {
      if (effect.kind === "close") {
        closePlayerSocket();
        continue;
      }
      openPlayerSocket(effect.url, {
        receive: ({ count }) => dispatch({ kind: "count", count }),
        link: (link) => dispatch({ kind: "link", link }),
      });
    }
  };

  return {
    presence: GUEST_PRESENCE,
    count: null,
    isDown: false,
    follow: (playerId, socketUrl) => dispatch({ kind: "follow", playerId, socketUrl }),
    retry: () => retryPlayerSocket(),
  };
});
