import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";

export type DevPlayerNickname = Parameters<
  (typeof apiClient.api.dev)["sign-in"]["post"]
>[0]["nickname"];

async function signInAsDevPlayer(nickname: DevPlayerNickname) {
  const { error } = await apiClient.api.dev["sign-in"].post({ nickname });
  if (error) throw error;
}

export function useDevSignIn(nickname: DevPlayerNickname) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: () => signInAsDevPlayer(nickname),
    // Everything cached so far belongs to whoever was signed in before.
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return {
    signIn: () => mutate(),
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
