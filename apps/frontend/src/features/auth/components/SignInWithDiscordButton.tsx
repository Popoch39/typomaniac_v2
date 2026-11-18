import { useSignInWithDiscord } from "../hooks/useSignInWithDiscord.ts";

export function SignInWithDiscordButton() {
  const { signIn, isPending, failure } = useSignInWithDiscord();

  return (
    <div className="sign-in-with-discord">
      <button type="button" onClick={signIn} disabled={isPending}>
        {isPending ? "Redirecting…" : "Sign in with Discord"}
      </button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
