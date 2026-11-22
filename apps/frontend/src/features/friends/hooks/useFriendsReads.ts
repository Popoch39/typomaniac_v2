import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage, retryFailed } from "../../../shared/api/readStage.ts";
import { friendRequestsQueryOptions } from "../api/friendRequestsQueryOptions.ts";
import { friendsQueryOptions } from "../api/friendsQueryOptions.ts";
import { useFriendStateStore } from "../store/useFriendStateStore.ts";

/**
 * The reads the Friends page lays out, its Friends and its Friend requests, sent together so that the
 * page is drawn once both are back, and tried again together. It also waits for the Friends' states
 * from the Player socket, so that the list is drawn in its order rather than reordered at once.
 */
export function useFriendsReads() {
  const friends = useQuery(friendsQueryOptions());
  const requests = useQuery(friendRequestsQueryOptions());
  const error = friends.error ?? requests.error;
  const statesKnown = useFriendStateStore((state) => state.states !== null);
  const stage = readStage([friends, requests]);
  return {
    friends: friends.data,
    requests: requests.data,
    stage: stage === "ready" && !statesKnown ? "loading" : stage,
    failure: error === null ? null : describeApiError(error),
    retry: () => retryFailed([friends, requests]),
  };
}
