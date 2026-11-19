import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/components/ui/table.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { pagePositions } from "../page/pagePositions.ts";
import { AroundYouRows } from "./AroundYouRows.tsx";
import { LeaderboardRow } from "./LeaderboardRow.tsx";

interface LeaderboardTableProps {
  players: LeaderboardPlayer[];
  own: LeaderboardPlayer | null;
  /** The reader between their neighbours, when neither on the Podium nor on this page. */
  around: LeaderboardPlayer[] | null;
}

// On a narrow screen the table scrolls sideways inside its box rather than squeezing its columns.
export function LeaderboardTable({ players, own, around }: LeaderboardTableProps) {
  const positions = pagePositions(players);

  return (
    <div className="w-full overflow-hidden rounded-[20px] border-3 border-key-outline bg-surface-card">
      <Table className="min-w-170 text-ink">
        <TableCaption className="sr-only">Leaderboard, {positions}</TableCaption>
        <TableHeader>
          <TableRow className="border-0 bg-surface-raised hover:bg-surface-raised">
            <TableHead className="h-auto w-22 py-4 pr-4 pl-5 text-right type-table-head text-ink-subtle">
              Position
            </TableHead>
            <TableHead className="h-auto p-4 type-table-head text-ink-subtle">Player</TableHead>
            <TableHead className="h-auto p-4 type-table-head text-ink-subtle">Rank</TableHead>
            <TableHead className="h-auto w-30 py-4 pr-6 pl-4 text-right type-table-head text-ink-subtle">
              LP
            </TableHead>
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
        {around !== null && <AroundYouRows around={around} own={own} />}
      </Table>
    </div>
  );
}
