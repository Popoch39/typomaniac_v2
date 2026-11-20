import { LoadingPixels } from "../../../shared/components/LoadingPixels.tsx";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";

// The boxes of the waiting screen as its usual viewer, the Participant who opened the Duel, sees it:
// their own chip (the `sm` Ornament frame and the name), "vs", the wait for an Opponent, and the link
// to send.
export function DuelSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4 text-xl text-muted-foreground">
        <span className="flex min-w-0 items-center gap-3">
          <SkeletonBlock className="h-19 w-16 flex-none rounded-lg" />
          <SkeletonBlock className="h-lh w-32" />
        </span>
        <span>vs</span>
        <LoadingPixels />
      </div>
      <SkeletonBlock className="h-lh w-full max-w-2xl" />
    </>
  );
}
