import { AllRankedPlayersSkeleton } from "./AllRankedPlayersSkeleton.tsx";
import { PodiumSkeleton } from "./PodiumSkeleton.tsx";
import { YourPositionSkeleton } from "./YourPositionSkeleton.tsx";

interface LeaderboardSkeletonProps {
  /** For a signed-in Player: a Guest has no "Your position" Panel. */
  withYourPosition: boolean;
}

/** The Leaderboard's sections at their loaded size, with recessed blocks in place of the data. */
export function LeaderboardSkeleton({ withYourPosition }: LeaderboardSkeletonProps) {
  return (
    <>
      <PodiumSkeleton />
      {withYourPosition && <YourPositionSkeleton />}
      <AllRankedPlayersSkeleton />
    </>
  );
}
