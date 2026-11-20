import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { PodiumPedestal } from "./PodiumPedestal.tsx";

interface PodiumStepSkeletonProps {
  position: 1 | 2 | 3;
}

// The boxes of PodiumPlayer: the `md` Ornament frame, the Nickname line and the Tier badge.
export function PodiumStepSkeleton({ position }: PodiumStepSkeletonProps) {
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col items-center gap-3.5 pb-2.5",
        position === 2 && "md:-order-1",
      )}
    >
      <SkeletonBlock className="h-38 w-32 rounded-2xl" />
      <SkeletonBlock className="h-lh w-36 text-2xl" />
      <SkeletonBlock className="h-14 w-40" />
      <PodiumPedestal position={position} />
    </li>
  );
}
