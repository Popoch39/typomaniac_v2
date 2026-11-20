import { useSignOut } from "../../auth/hooks/useSignOut.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { PlayerBlockLayout } from "./PlayerBlockLayout.tsx";
import { PlayerChip } from "./PlayerChip.tsx";
import { SidebarSignOutButton } from "./SidebarSignOutButton.tsx";

interface PlayerIdentityProps {
  player: SignedInPlayer;
}

export function PlayerIdentity({ player }: PlayerIdentityProps) {
  const { signOut, isPending, failure } = useSignOut();

  return (
    <PlayerBlockLayout
      chip={<PlayerChip player={player} />}
      action={<SidebarSignOutButton onSignOut={signOut} isPending={isPending} />}
      failure={failure}
    />
  );
}
