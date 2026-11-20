import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";
import { TableCell, TableRow } from "../../../shared/components/ui/table.tsx";

// The boxes of LeaderboardRow: the Position, the `sm` Ornament frame and Nickname, the Tier badge and
// Rank name, the LP.
export function LeaderboardRowSkeleton() {
  return (
    <TableRow className="border-t-2 border-b-0 border-surface-plate hover:bg-transparent">
      <TableCell className="py-2.5 pr-4 pl-5">
        <SkeletonBlock className="ml-auto h-lh w-8 font-mono text-[17px]" />
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <span className="flex items-center gap-3.5">
          <SkeletonBlock className="h-19 w-16" />
          <SkeletonBlock className="h-lh w-32 text-base" />
        </span>
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <SkeletonBlock className="h-14 w-36" />
      </TableCell>
      <TableCell className="py-2.5 pr-6 pl-4">
        <SkeletonBlock className="ml-auto h-lh w-14 font-mono text-[17px]" />
      </TableCell>
    </TableRow>
  );
}
