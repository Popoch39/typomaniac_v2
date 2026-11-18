import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/components/ui/table.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { LeaderboardRow } from "./LeaderboardRow.tsx";

interface LeaderboardTableProps {
  players: LeaderboardPlayer[];
  own: LeaderboardPlayer | null;
}

export function LeaderboardTable({ players, own }: LeaderboardTableProps) {
  return (
    <div className="w-full max-w-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Position</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Rank</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <LeaderboardRow
              key={player.position}
              player={player}
              isOwn={player.position === own?.position}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
