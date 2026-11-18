import { Link } from "@tanstack/react-router";
import { Avatar } from "../../auth/components/Avatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import { SignOutButton } from "../../auth/components/SignOutButton.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";

interface PlayerIdentityProps {
  player: SignedInPlayer;
}

export function PlayerIdentity({ player }: PlayerIdentityProps) {
  return (
    <>
      <Link to="/profile" className="player-identity">
        <Avatar player={player} />
        <span className="player-name sidebar-label">
          <PlayerNickname player={player} />
        </span>
      </Link>
      <SignOutButton />
    </>
  );
}
