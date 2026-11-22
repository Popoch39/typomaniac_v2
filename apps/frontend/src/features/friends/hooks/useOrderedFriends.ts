import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { orderFriends } from "../presence/orderFriends.ts";
import { useFriendStateStore } from "../store/useFriendStateStore.ts";

/** The Friends with the Online ones first, reordered as their states change. */
export function useOrderedFriends(friends: ListedPlayer[]) {
  const states = useFriendStateStore((state) => state.states);
  return orderFriends(friends, states);
}
