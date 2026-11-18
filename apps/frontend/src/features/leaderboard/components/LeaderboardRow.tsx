import { TableCell, TableRow } from "../../../shared/components/ui/table.tsx";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { LeaderboardRank } from "./LeaderboardRank.tsx";

interface LeaderboardRowProps {
  player: LeaderboardPlayer;
  isOwn: boolean;
}

export function LeaderboardRow({ player, isOwn }: LeaderboardRowProps) {
  return (
    <TableRow aria-current={isOwn ? "true" : undefined} className="aria-[current=true]:bg-accent">
      <TableCell className="font-mono">{player.position}</TableCell>
      <TableCell>
        <span className="flex items-center gap-3">
          <PlayerAvatar player={player} className="size-8" />
          <PlayerNickname player={player} />
        </span>
      </TableCell>
      <TableCell>
        <LeaderboardRank player={player} />
      </TableCell>
    </TableRow>
  );
}
