import { SignInWithDiscordButton } from "../../auth/components/SignInWithDiscordButton.tsx";

export function GuestIdentity() {
  return (
    <>
      <p className="player-name">Guest</p>
      <SignInWithDiscordButton />
    </>
  );
}
