import { create } from "zustand";
import type { PlayerServerMessage } from "../../online/message/parsePlayerMessage.ts";
import { type FriendStates, nextFriendStates } from "../presence/friendStates.ts";

type FriendStateState = {
  /** Each Friend's state, as the Player socket told it; `null` until it has told them. */
  readonly states: FriendStates | null;
  readonly receive: (message: PlayerServerMessage) => void;
  /** No state can be told, the socket being refused or closed: every Friend reads as offline. */
  readonly giveUp: () => void;
  /** Forgets the states of another Player's Friends. */
  readonly reset: () => void;
};

export const useFriendStateStore = create<FriendStateState>()((set, get) => ({
  states: null,
  receive: (message) => set({ states: nextFriendStates(get().states, message) }),
  giveUp: () => set({ states: get().states ?? {} }),
  reset: () => set({ states: null }),
}));
