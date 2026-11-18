import { useSignedInPlayer } from "../hooks/useSignedInPlayer.ts";
import { SignInWithDiscordButton } from "./SignInWithDiscordButton.tsx";

export function SignInStatus() {
  const { player, isPending, failure } = useSignedInPlayer();

  if (isPending) return <p className="sign-in-status">Checking your session…</p>;
  if (failure) return <p role="alert">{failure}</p>;
  if (player === null) return <SignInWithDiscordButton />;
  return (
    <p className="sign-in-status">
      {player.nickname === null
        ? "Signed in. You have not chosen a Nickname yet."
        : `Signed in as ${player.nickname}`}
    </p>
  );
}
