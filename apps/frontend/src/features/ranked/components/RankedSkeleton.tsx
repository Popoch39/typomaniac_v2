import { RankedQueueSkeleton } from "../../queue/components/RankedQueueSkeleton.tsx";
import { RankCardSkeleton } from "./RankCardSkeleton.tsx";
import { TierLadderSkeleton } from "./TierLadderSkeleton.tsx";

/** The Ranked grid at its loaded size, with recessed blocks in place of the Standing. */
export function RankedSkeleton() {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
        <RankCardSkeleton />
        <RankedQueueSkeleton />
      </div>
      <TierLadderSkeleton />
    </>
  );
}
