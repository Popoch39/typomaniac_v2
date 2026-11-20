import { Panel } from "../../../shared/components/Panel.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";

// The boxes of QueueIdle: the headline and its line, then the "Find a Duel" key at the bottom.
export function RankedQueueSkeleton() {
  return (
    <Panel title="Queue" isLoading>
      <div className="flex flex-1 flex-col justify-between gap-7">
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-lh w-3/5 type-headline" />
          <SkeletonBlock className="h-lh w-4/5" />
        </div>
        <div className="pb-2">
          <SkeletonBlock className="min-h-21 w-full rounded-2xl" />
        </div>
      </div>
    </Panel>
  );
}
