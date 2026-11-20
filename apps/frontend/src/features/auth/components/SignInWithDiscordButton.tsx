import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useSignInWithDiscord } from "../hooks/useSignInWithDiscord.ts";

export function SignInWithDiscordButton() {
  const { signIn, isPending, failure } = useSignInWithDiscord();

  return (
    <div className="flex flex-col items-start gap-3 pb-2">
      <Keycap type="button" variant="brand" size="lg" onClick={signIn} disabled={isPending}>
        {isPending ? "Redirecting…" : "Sign in with Discord"}
      </Keycap>
      <DangerStatusLine message={failure} />
    </div>
  );
}
