import { TableCell, TableRow } from "../../../shared/components/ui/table.tsx";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { LeaderboardRank } from "./LeaderboardRank.tsx";

interface LeaderboardRowProps {
  player: LeaderboardPlayer;
  isOwn: boolean;
}

// Rows are split by a line of the plate, not a grey rule.
export function LeaderboardRow({ player, isOwn }: LeaderboardRowProps) {
  return (
    <TableRow
      aria-current={isOwn ? "true" : undefined}
      className="border-t-2 border-b-0 border-surface-plate hover:bg-transparent aria-[current=true]:bg-key-face"
    >
      <TableCell className="px-5 py-3.5 font-mono font-bold">{player.position}</TableCell>
      <TableCell className="px-3 py-3.5">
        <span className="flex items-center gap-3 font-bold">
          <PlayerAvatar player={player} isOwn={isOwn} className="size-9 text-sm" />
          <PlayerNickname player={player} />
        </span>
      </TableCell>
      <TableCell className="px-5 py-3.5 font-mono text-ink-muted">
        <LeaderboardRank player={player} />
      </TableCell>
    </TableRow>
  );
}
