import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { refreshFriendReads } from "../api/friendsQueryOptions.ts";
import { describeFriendFailure } from "../request/describeFriendFailure.ts";

/** Every label of the key, so that it keeps the size of the longest. */
export const CANCEL_LABELS = ["Cancel", "Cancelling…"] as const;

async function cancel(receiverId: string) {
  const { error } = await apiClient.api.friends.requests({ playerId: receiverId }).delete();
  if (error) throw error;
}

/** Cancelling a sent Friend request. */
export function useCancelRequest(receiverId: string) {
  const { mutate, isPending, error } = useMutation({
    mutationFn: cancel,
    onSuccess: refreshFriendReads,
  });
  return {
    label: isPending ? CANCEL_LABELS[1] : CANCEL_LABELS[0],
    disabled: isPending,
    cancel: () => mutate(receiverId),
    failure: error === null ? null : describeFriendFailure(error),
  };
}
