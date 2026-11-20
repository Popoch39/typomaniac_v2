import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";
import { playerChipClassName } from "../chip/playerChipClassName.ts";
import { PlayerBlockLayout } from "./PlayerBlockLayout.tsx";

// The boxes of the PlayerChip: the `sm` Ornament frame around the avatar key, the Nickname and the
// Standing line; then the sidebar key under it. On the icon rail, the frame shrinks as the avatar does.
export function PlayerBlockSkeleton() {
  return (
    <PlayerBlockLayout
      chip={
        <div className={playerChipClassName}>
          <SkeletonBlock className="h-19 w-16 shrink-0 group-data-[collapsible=icon]:[zoom:0.75]" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <SkeletonBlock className="h-lh w-24 max-w-full" />
            <SkeletonBlock className="h-lh w-16 max-w-full type-mono-sm" />
          </span>
        </div>
      }
      action={<SkeletonBlock className="h-8 w-full group-data-[collapsible=icon]:w-8" />}
      failure={null}
    />
  );
}
