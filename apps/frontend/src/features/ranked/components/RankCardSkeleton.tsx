import { Panel } from "../../../shared/components/Panel.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";

// The boxes of RankSummary: the `lg` Tier badge beside the Rank name and LP; the LP bar with its line
// above, and the hint below, in the box a Placement summary shares.
export function RankCardSkeleton() {
  return (
    <Panel title="Your Rank" isLoading>
      <div className="flex flex-wrap items-center gap-6">
        <SkeletonBlock className="size-32 shrink-0 rounded-2xl" />
        <div className="flex min-w-0 flex-col gap-2">
          <SkeletonBlock className="h-lh w-56 max-w-full type-rank-title" />
          <SkeletonBlock className="h-10 w-28" />
        </div>
      </div>
      <div className="flex min-h-24 flex-col gap-3">
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-lh font-mono text-[13px]" />
          <SkeletonBlock className="h-5.5 rounded-xs" />
        </div>
        <SkeletonBlock className="h-lh w-3/4 text-sm" />
      </div>
    </Panel>
  );
}
