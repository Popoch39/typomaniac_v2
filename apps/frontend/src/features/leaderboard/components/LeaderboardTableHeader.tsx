import { TableHead, TableHeader, TableRow } from "../../../shared/components/ui/table.tsx";

export function LeaderboardTableHeader() {
  return (
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
  );
}
