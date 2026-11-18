import { Avatar } from "../../auth/components/Avatar.tsx";
import "./PlayerProfile.css";

interface PlayerProfileProps {
  nickname: string | null;
  avatarUrl: string | null;
}

export function PlayerProfile({ nickname, avatarUrl }: PlayerProfileProps) {
  return (
    <div className="player-profile">
      <Avatar avatarUrl={avatarUrl} nickname={nickname} />
      <p className="player-profile-nickname">{nickname ?? "No Nickname yet"}</p>
    </div>
  );
}
