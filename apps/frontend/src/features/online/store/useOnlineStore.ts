import { create } from "zustand";
import { closePlayerSocket, openPlayerSocket } from "../socket/playerSocket.ts";

type OnlineState = {
  /** The signed-in Player whose socket is open, `null` for a Guest or before the Player is known. */
  readonly playerId: string | null;
  /** How many Players are Online, as the Player socket last told, or `null` while unknown. */
  readonly count: number | null;
  /** Opens the Player socket for a signed-in Player, or closes it for a Guest. */
  readonly follow: (playerId: string | null) => void;
};

export const useOnlineStore = create<OnlineState>()((set, get) => ({
  playerId: null,
  count: null,
  follow: (playerId) => {
    if (playerId === get().playerId) return;
    closePlayerSocket();
    set({ playerId, count: null });
    if (playerId === null) return;
    openPlayerSocket({
      receive: ({ count }) => set({ count }),
      refuse: () => set({ count: null }),
      // The count stays shown while the socket is reopened, so that a restart does not blank it.
      reconnect: () => get().playerId === playerId,
      disconnect: () => set({ count: null }),
    });
  },
}));
