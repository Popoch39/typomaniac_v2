import { create } from "zustand";
import { useChallengeStore } from "../../challenge/store/useChallengeStore.ts";
import { refreshFriendReads } from "../../friends/api/friendsQueryOptions.ts";
import { useFriendStateStore } from "../../friends/store/useFriendStateStore.ts";
import type { PlayerServerMessage } from "../message/parsePlayerMessage.ts";
import { closePlayerSocket, openPlayerSocket } from "../socket/playerSocket.ts";

type OnlineState = {
  /** The signed-in Player whose socket is open, `null` for a Guest or before the Player is known. */
  readonly playerId: string | null;
  /** How many Players are Online, as the Player socket last told, or `null` while unknown. */
  readonly count: number | null;
  /** Opens the Player socket for a signed-in Player, or closes it for a Guest. */
  readonly follow: (playerId: string | null) => void;
};

// The Friends and Friend requests read again when the socket says they changed, and when it tells
// the Friends' states on opening, since a reconnection may have missed a change.
const changesFriendReads = (message: PlayerServerMessage) =>
  message.type !== "onlineCount" &&
  message.type !== "friendState" &&
  !message.type.startsWith("challenge");

export const useOnlineStore = create<OnlineState>()((set, get) => ({
  playerId: null,
  count: null,
  follow: (playerId) => {
    if (playerId === get().playerId) return;
    closePlayerSocket();
    set({ playerId, count: null });
    const friendStates = useFriendStateStore.getState();
    friendStates.reset();
    const challenges = useChallengeStore.getState();
    challenges.reset();
    if (playerId === null) return;
    openPlayerSocket({
      receive: (message) => {
        if (message.type === "onlineCount") return set({ count: message.count });
        friendStates.receive(message);
        challenges.receive(message);
        if (changesFriendReads(message)) void refreshFriendReads();
      },
      refuse: () => {
        set({ count: null });
        friendStates.giveUp();
        challenges.reset();
      },
      // The count stays shown while the socket is reopened, so that a restart does not blank it.
      reconnect: () => {
        const isFollowed = get().playerId === playerId;
        if (isFollowed) challenges.drop();
        return isFollowed;
      },
      disconnect: () => {
        set({ count: null });
        friendStates.giveUp();
        challenges.reset();
      },
    });
  },
}));
