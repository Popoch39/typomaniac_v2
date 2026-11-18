import { Link } from "@tanstack/react-router";
import { Avatar } from "../../auth/components/Avatar.tsx";
import { SignOutButton } from "../../auth/components/SignOutButton.tsx";

interface PlayerIdentityProps {
  nickname: string | null;
  avatarUrl: string | null;
}

export function PlayerIdentity({ nickname, avatarUrl }: PlayerIdentityProps) {
  return (
    <>
      <Link to="/profile" className="player-identity">
        <Avatar avatarUrl={avatarUrl} nickname={nickname} />
        <span className="player-name sidebar-label">{nickname ?? "No Nickname yet"}</span>
      </Link>
      <SignOutButton />
    </>
  );
}
