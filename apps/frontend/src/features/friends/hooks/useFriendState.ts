import { friendStateLabel } from "../presence/friendStates.ts";
import { useFriendStateStore } from "../store/useFriendStateStore.ts";

/** The Friend's state as the Player reads it, live. */
export function useFriendState(friendId: string) {
  const state = useFriendStateStore((store) => store.states?.[friendId]);
  return { state: state ?? "offline", label: friendStateLabel(state) };
}
