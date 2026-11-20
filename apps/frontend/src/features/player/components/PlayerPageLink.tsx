import { Link } from "@tanstack/react-router";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";

interface PlayerPageLinkProps {
  player: { nickname: string | null };
}

/** The Player's Nickname, leading to their public page; a Player without one has no page to lead to. */
export function PlayerPageLink({ player }: PlayerPageLinkProps) {
  if (player.nickname === null) return <PlayerNickname player={player} />;
  return (
    <Link
      to="/players/$nickname"
      params={{ nickname: player.nickname }}
      className="rounded-sm text-inherit no-underline underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
    >
      {player.nickname}
    </Link>
  );
}
