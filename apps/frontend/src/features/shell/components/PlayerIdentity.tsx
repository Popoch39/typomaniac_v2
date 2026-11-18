import { Link } from "@tanstack/react-router";
import { SignOutButton } from "../../auth/components/SignOutButton.tsx";

interface PlayerIdentityProps {
  nickname: string | null;
}

export function PlayerIdentity({ nickname }: PlayerIdentityProps) {
  return (
    <>
      <Link to="/profile" className="player-name">
        {nickname ?? "No Nickname yet"}
      </Link>
      <SignOutButton />
    </>
  );
}
