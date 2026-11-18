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
      <div className="player-identity">
        <Avatar avatarUrl={avatarUrl} nickname={nickname} />
        <Link to="/profile" className="player-name">
          {nickname ?? "No Nickname yet"}
        </Link>
      </div>
      <SignOutButton />
    </>
  );
}
