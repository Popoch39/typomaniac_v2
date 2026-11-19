import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useLeaderboardRank } from "../hooks/useLeaderboardRank.ts";

interface PodiumPlayerProps {
  player: LeaderboardPlayer;
  isOwn: boolean;
}

export function PodiumPlayer({ player, isOwn }: PodiumPlayerProps) {
  const { name } = useLeaderboardRank(player);

  return (
    <>
      <OrnamentedAvatar player={player} ornament={player.ornament} size="md" isOwn={isOwn} />
      <span className="max-w-full truncate text-2xl font-extrabold text-ink">
        <PlayerNickname player={player} />
      </span>
      <span className="flex items-center gap-3">
        <TierBadge tier={player.rank.tier} size="sm" />
        <span className="flex flex-col gap-1">
          <span className="type-tier-name text-ink">{name}</span>
          <span className="font-mono text-[17px] font-bold text-ink">
            {player.rank.lp} <span className="text-[13px] text-ink-subtle">LP</span>
          </span>
        </span>
      </span>
    </>
  );
}
