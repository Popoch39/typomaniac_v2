import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readGate, readStage, retryFailed } from "../../../shared/api/readStage.ts";
import { friendRequestsQueryOptions } from "../api/friendRequestsQueryOptions.ts";
import { friendsQueryOptions } from "../api/friendsQueryOptions.ts";

/**
 * The reads the Friends page lays out, its Friends and its Friend requests, sent together so that the
 * page is drawn once both are back, and tried again together.
 */
export function useFriendsReads() {
  const friends = useQuery(friendsQueryOptions());
  const requests = useQuery(friendRequestsQueryOptions());
  const error = friends.error ?? requests.error;
  return readGate(
    readStage([friends, requests]),
    friends.data === undefined || requests.data === undefined
      ? undefined
      : { friends: friends.data, requests: requests.data },
    error === null ? null : describeApiError(error),
    () => retryFailed([friends, requests]),
  );
}
