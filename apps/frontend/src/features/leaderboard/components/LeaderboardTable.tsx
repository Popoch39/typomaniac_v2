import { Table, TableBody, TableCaption } from "../../../shared/components/ui/table.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { pagePositions } from "../page/pagePositions.ts";
import { AroundYouRows } from "./AroundYouRows.tsx";
import { LeaderboardTableHeader } from "./LeaderboardTableHeader.tsx";
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
        <LeaderboardTableHeader />
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
