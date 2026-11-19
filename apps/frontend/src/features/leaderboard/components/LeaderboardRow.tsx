import { TableCell, TableRow } from "../../../shared/components/ui/table.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useLeaderboardRank } from "../hooks/useLeaderboardRank.ts";

interface LeaderboardRowProps {
  player: LeaderboardPlayer;
  isOwn: boolean;
}

// Rows are split by a line of the plate, not a grey rule.
export function LeaderboardRow({ player, isOwn }: LeaderboardRowProps) {
  const { name } = useLeaderboardRank(player);

  return (
    <TableRow
      aria-current={isOwn ? "true" : undefined}
      className="border-t-2 border-b-0 border-surface-plate hover:bg-transparent aria-[current=true]:bg-key-face"
    >
      <TableCell className="py-2.5 pr-4 pl-5 text-right font-mono text-[17px] font-bold">
        {player.position}
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <span className="flex items-center gap-3.5 text-base font-extrabold">
          <OrnamentedAvatar player={player} ornament={player.ornament} size="sm" isOwn={isOwn} />
          <PlayerNickname player={player} />
        </span>
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <span className="flex items-center gap-3">
          <TierBadge tier={player.rank.tier} size="sm" />
          <span className="type-tier-name">{name}</span>
        </span>
      </TableCell>
      <TableCell className="py-2.5 pr-6 pl-4 text-right font-mono text-[17px] font-bold">
        {player.rank.lp} <span className="text-[13px] text-ink-subtle">LP</span>
      </TableCell>
    </TableRow>
  );
}
