import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { LpAmount } from "./LpAmount.tsx";
import { RankLabel } from "./RankLabel.tsx";
import { YouTag } from "./YouTag.tsx";

interface PodiumPlayerProps {
  player: LeaderboardPlayer;
  isOwn: boolean;
}

export function PodiumPlayer({ player, isOwn }: PodiumPlayerProps) {
  return (
    <>
      <OrnamentedAvatar player={player} ornament={player.ornament} size="md" isOwn={isOwn} />
      <span className="flex max-w-full items-center gap-2.5">
        <span className="min-w-0 truncate text-2xl font-extrabold text-ink">
          <PlayerNickname player={player} />
        </span>
        {isOwn && <YouTag />}
      </span>
      <RankLabel rank={player.rank}>
        <span className="font-mono text-[17px] font-bold text-ink">
          <LpAmount lp={player.rank.lp} />
        </span>
      </RankLabel>
    </>
  );
}
