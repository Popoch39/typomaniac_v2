import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { refreshFriendReads } from "../api/friendsQueryOptions.ts";
import { addFriendKey, type Relation } from "../relation/addFriendKey.ts";
import { describeFriendFailure } from "../request/describeFriendFailure.ts";

async function send(playerId: string) {
  const { error } = await apiClient.api.friends.requests.post({ playerId });
  if (error) throw error;
}

async function accept(playerId: string) {
  const { error } = await apiClient.api.friends.requests({ playerId }).accept.post();
  if (error) throw error;
}

/** The Add Friend key on another Player: sends them a request, or accepts the one they sent. */
export function useAddFriendKey({ id, relation }: { id: string; relation: Relation }) {
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (act: "send" | "accept") => (act === "send" ? send(id) : accept(id)),
    onSuccess: refreshFriendReads,
  });
  const { label, act } = addFriendKey({ relation, isPending });
  return {
    label,
    disabled: act === null,
    press: () => {
      if (act !== null) mutate(act);
    },
    failure: error === null ? null : describeFriendFailure(error),
  };
}
