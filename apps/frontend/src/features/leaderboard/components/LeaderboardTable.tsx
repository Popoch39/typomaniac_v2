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
    <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-3 border-key-outline bg-surface-card">
      <Table className="text-[15px] text-ink">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="h-auto w-20 px-5 py-4 type-table-head text-ink-subtle">
              Position
            </TableHead>
            <TableHead className="h-auto px-3 py-4 type-table-head text-ink-subtle">
              Player
            </TableHead>
            <TableHead className="h-auto px-5 py-4 type-table-head text-ink-subtle">Rank</TableHead>
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
