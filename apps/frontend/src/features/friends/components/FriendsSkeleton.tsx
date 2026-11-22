import { Panel } from "../../../shared/components/Panel.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";

const PANELS = ["Received requests", "Sent requests", "Friends"] as const;

export function FriendsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-7 pb-2.5">
      <div className="flex flex-col gap-7">
        {PANELS.map((title) => (
          <Panel key={title} title={title} isLoading>
            <SkeletonBlock className="h-lh w-3/4" />
          </Panel>
        ))}
      </div>
      <Panel title="Add a Friend">
        <SkeletonBlock className="h-11" />
        <SkeletonBlock className="h-lh w-2/3" />
      </Panel>
    </div>
  );
}
