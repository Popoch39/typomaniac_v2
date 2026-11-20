import { useMutation } from "@tanstack/react-query";
import { authClient } from "../../../shared/api/authClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";

async function signInWithDiscord() {
  // On success the client leaves the page for Discord, then Better Auth brings the Player back to /,
  // or to the sign-in screen, saying why, when it refuses them (a Ban among others).
  const { error } = await authClient.signIn.social({
    provider: "discord",
    callbackURL: "/",
    errorCallbackURL: "/sign-in",
  });
  if (error) throw error;
}

export function useSignInWithDiscord() {
  const { mutate, isPending, error } = useMutation({ mutationFn: signInWithDiscord });
  return {
    signIn: () => mutate(),
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
