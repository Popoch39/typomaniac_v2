import { create } from "zustand";
import { useChallengeStore } from "../../challenge/store/useChallengeStore.ts";
import { refreshFriendReads } from "../../friends/api/friendsQueryOptions.ts";
import { useFriendStateStore } from "../../friends/store/useFriendStateStore.ts";
import {
  GUEST_PRESENCE,
  type OnlinePresence,
  type OnlinePresenceEffect,
  type OnlinePresenceEvent,
  nextOnlinePresence,
  onlineCountOf,
} from "../presence/onlinePresence.ts";
import { closePlayerSocket, openPlayerSocket, retryPlayerSocket } from "../socket/playerSocket.ts";

// `count` and `isDown` mirror `presence`, computed once in `dispatch`: components narrow on
// `presence`, and the store's tests read them through `getState()`.
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
    for (const effect of effects) perform(effect);
  };

  const perform = (effect: OnlinePresenceEffect) => {
    switch (effect.kind) {
      case "close":
        return closePlayerSocket();
      case "open":
        return openPlayerSocket(effect.url, {
          receive: (message) => dispatch({ kind: "receive", message }),
          link: (link) => dispatch({ kind: "link", link }),
        });
      case "relay":
        useFriendStateStore.getState().receive(effect.message);
        useChallengeStore.getState().receive(effect.message);
        return;
      case "refreshFriendReads":
        return void refreshFriendReads();
      case "forget":
        useFriendStateStore.getState().reset();
        useChallengeStore.getState().reset();
        return;
      case "giveUp":
        useFriendStateStore.getState().giveUp();
        useChallengeStore.getState().reset();
        return;
      case "dropChallenges":
        return useChallengeStore.getState().drop();
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
