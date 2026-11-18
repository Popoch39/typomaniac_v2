import { Avatar } from "../../auth/components/Avatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import "./PlayerProfile.css";

interface PlayerProfileProps {
  player: SignedInPlayer;
}

export function PlayerProfile({ player }: PlayerProfileProps) {
  return (
    <div className="player-profile">
      <Avatar player={player} />
      <p className="player-profile-nickname">
        <PlayerNickname player={player} />
      </p>
    </div>
  );
}
