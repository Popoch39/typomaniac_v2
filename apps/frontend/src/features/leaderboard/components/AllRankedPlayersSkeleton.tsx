import { LoadingPixels } from "../../../shared/components/LoadingPixels.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";
import { LeaderboardTableSkeleton } from "./LeaderboardTableSkeleton.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

// The count of ranked Players is not known yet: the loading pixels blink in its place.
export function AllRankedPlayersSkeleton() {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader
        titleId="all-players-skeleton-title"
        title="All ranked Players"
        aside={<LoadingPixels size="sm" />}
      />
      <LeaderboardTableSkeleton />
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1.5">
        <SkeletonBlock className="h-lh w-56 font-mono text-[13px]" />
        <SkeletonBlock className="h-11 w-96 max-w-full" />
      </div>
    </section>
  );
}
