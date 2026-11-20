import { Panel } from "../../../shared/components/Panel.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";

// The boxes of OwnRankedPosition, a ranked Player's being the usual one: the Position, `sm` Ornament
// frame and Nickname; the LP bar with its line above; the "Show my row" key.
export function YourPositionSkeleton() {
  return (
    <Panel title="Your position" isLoading flat>
      <div className="flex flex-wrap items-center gap-6 pb-1">
        <SkeletonBlock className="h-19 w-72 flex-none" />
        <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-3">
          <SkeletonBlock className="h-lh font-mono text-[13px]" />
          <SkeletonBlock className="h-5.5 rounded-xs" />
        </span>
        <span className="flex-none pb-1">
          <SkeletonBlock className="h-11 w-34" />
        </span>
      </div>
    </Panel>
  );
}
