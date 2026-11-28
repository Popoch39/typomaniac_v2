import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../shared/api/authClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { useQueueStore } from "../../queue/store/useQueueStore.ts";
import { meQueryOptions } from "../api/meQueryOptions.ts";

async function signOut() {
  const { error } = await authClient.signOut();
  if (error) throw error;
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const leaveQueue = useQueueStore((state) => state.leave);
  const { mutate, isPending, error } = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // No Queue runs for a person who is no longer signed in.
      leaveQueue();
      // The session cookie is gone: the page shows a Guest without asking the API again.
      queryClient.setQueryData(meQueryOptions().queryKey, null);
    },
  });
  return {
    signOut: () => mutate(),
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
