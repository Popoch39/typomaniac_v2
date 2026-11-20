import { useSignInWithDiscord } from "../../auth/hooks/useSignInWithDiscord.ts";
import { GuestChip } from "./GuestChip.tsx";
import { PlayerBlockLayout } from "./PlayerBlockLayout.tsx";
import { SidebarSignInButton } from "./SidebarSignInButton.tsx";

export function GuestIdentity() {
  const { signIn, isPending, failure } = useSignInWithDiscord();

  return (
    <PlayerBlockLayout
      chip={<GuestChip />}
      action={<SidebarSignInButton onSignIn={signIn} isPending={isPending} />}
      failure={failure}
    />
  );
}
