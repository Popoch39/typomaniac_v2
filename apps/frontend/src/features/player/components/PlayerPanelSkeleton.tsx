import { Panel } from "../../../shared/components/Panel.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";

// The boxes of PlayerPanel: the `lg` Ornament frame beside the Nickname line.
export function PlayerPanelSkeleton() {
  return (
    <Panel title="Player">
      <div className="flex items-center gap-6 pb-1">
        <SkeletonBlock className="h-57 w-48 shrink-0 rounded-2xl" />
        <SkeletonBlock className="h-lh w-48 max-w-full type-card-title" />
      </div>
    </Panel>
  );
}
