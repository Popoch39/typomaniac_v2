import { create } from "zustand";
import { closePlayerSocket, openPlayerSocket, retryPlayerSocket } from "../socket/playerSocket.ts";

type OnlineState = {
  /** The signed-in Player whose socket is open, `null` for a Guest or before the Player is known. */
  readonly playerId: string | null;
  /** How many Players are Online, as the Player socket last told, or `null` while unknown. */
  readonly count: number | null;
  /** The Player socket dropped and could not be reopened yet: `count` is stale until it is. */
  readonly isDown: boolean;
  /** Opens the Player socket at `socketUrl` for a signed-in Player, or closes it for a Guest. */
  readonly follow: (playerId: string | null, socketUrl: string) => void;
  /** Tries to reopen a dropped Player socket now, as when the browser may have its network back. */
  readonly retry: () => void;
};

export const useOnlineStore = create<OnlineState>()((set, get) => ({
  playerId: null,
  count: null,
  isDown: false,
  follow: (playerId, socketUrl) => {
    if (playerId === get().playerId) return;
    closePlayerSocket();
    set({ playerId, count: null, isDown: false });
    if (playerId === null) return;
    openPlayerSocket(socketUrl, {
      receive: ({ count }) => set({ count, isDown: false }),
      refuse: () => set({ count: null }),
      reconnect: (attempt) => {
        if (get().playerId !== playerId) return false;
        // The count stays shown through the first reopening, so that a server restart does not blank it.
        if (attempt > 1) set({ isDown: true });
        return true;
      },
      disconnect: () => set({ count: null, isDown: false }),
    });
  },
  retry: () => retryPlayerSocket(),
}));
