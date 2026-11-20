import { Table, TableBody } from "../../../shared/components/ui/table.tsx";
import { LeaderboardRowSkeleton } from "./LeaderboardRowSkeleton.tsx";
import { LeaderboardTableHeader } from "./LeaderboardTableHeader.tsx";

// A full page, as many rows as the server serves at most.
const ROWS = Array.from({ length: 15 }, (_, index) => index);

export function LeaderboardTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-[20px] border-3 border-key-outline bg-surface-card">
      <Table className="min-w-170 text-ink">
        <LeaderboardTableHeader />
        <TableBody>
          {ROWS.map((row) => (
            <LeaderboardRowSkeleton key={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
