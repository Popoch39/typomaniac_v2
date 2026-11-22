import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { refreshFriendReads } from "../api/friendsQueryOptions.ts";
import { describeFriendFailure } from "../request/describeFriendFailure.ts";

/** Every label of the two keys, so that each keeps the size of its longest. */
export const ACCEPT_LABELS = ["Accept", "Accepting…"] as const;
export const DECLINE_LABELS = ["Decline", "Declining…"] as const;

async function accept(senderId: string) {
  const { error } = await apiClient.api.friends.requests({ playerId: senderId }).accept.post();
  if (error) throw error;
}

async function decline(senderId: string) {
  const { error } = await apiClient.api.friends.requests({ playerId: senderId }).decline.post();
  if (error) throw error;
}

/** Accepting or declining a received Friend request; declining tells the sender nothing. */
export function useReceivedRequestActions(senderId: string) {
  const accepting = useMutation({ mutationFn: accept, onSuccess: refreshFriendReads });
  const declining = useMutation({ mutationFn: decline, onSuccess: refreshFriendReads });
  const error = accepting.error ?? declining.error;
  return {
    acceptLabel: accepting.isPending ? ACCEPT_LABELS[1] : ACCEPT_LABELS[0],
    declineLabel: declining.isPending ? DECLINE_LABELS[1] : DECLINE_LABELS[0],
    disabled: accepting.isPending || declining.isPending,
    accept: () => accepting.mutate(senderId),
    decline: () => declining.mutate(senderId),
    failure: error === null ? null : describeFriendFailure(error),
  };
}
