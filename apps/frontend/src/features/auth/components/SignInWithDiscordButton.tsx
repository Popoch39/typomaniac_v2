import { LogIn } from "lucide-react";
import { Button } from "../../../shared/components/ui/button.tsx";
import { useSignInWithDiscord } from "../hooks/useSignInWithDiscord.ts";

export function SignInWithDiscordButton() {
  const { signIn, isPending, failure } = useSignInWithDiscord();

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={signIn} disabled={isPending}>
        <LogIn aria-hidden="true" />
        {isPending ? "Redirecting…" : "Sign in with Discord"}
      </Button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
