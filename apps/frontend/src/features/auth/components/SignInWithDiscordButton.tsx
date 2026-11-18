import { LogIn } from "lucide-react";
import { useSignInWithDiscord } from "../hooks/useSignInWithDiscord.ts";
import "./SignInWithDiscordButton.css";

export function SignInWithDiscordButton() {
  const { signIn, isPending, failure } = useSignInWithDiscord();

  return (
    <div className="sign-in-with-discord">
      <button type="button" onClick={signIn} disabled={isPending}>
        <LogIn aria-hidden="true" size={18} />
        <span className="button-label">{isPending ? "Redirecting…" : "Sign in with Discord"}</span>
      </button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
