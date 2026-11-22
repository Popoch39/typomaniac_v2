import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { refreshFriendReads } from "../api/friendsQueryOptions.ts";
import { describeFriendFailure } from "../request/describeFriendFailure.ts";

/** Every label of the key, so that it keeps the size of the longest. */
export const REMOVE_LABELS = ["Remove", "Removing…"] as const;

async function remove(friendId: string) {
  const { error } = await apiClient.api.friends({ playerId: friendId }).delete();
  if (error) throw error;
}

/** Removing a Friend, which tells them nothing. */
export function useRemoveFriend(friendId: string) {
  const { mutate, isPending, error } = useMutation({
    mutationFn: remove,
    onSuccess: refreshFriendReads,
  });
  return {
    label: isPending ? REMOVE_LABELS[1] : REMOVE_LABELS[0],
    disabled: isPending,
    remove: () => mutate(friendId),
    failure: error === null ? null : describeFriendFailure(error),
  };
}
