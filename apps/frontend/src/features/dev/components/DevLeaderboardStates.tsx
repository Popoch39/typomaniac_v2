import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import { LeaderboardSections } from "../../leaderboard/components/LeaderboardSections.tsx";
import { LeaderboardSkeleton } from "../../leaderboard/components/LeaderboardSkeleton.tsx";
import { leaderboardFixture } from "../fixtures/leaderboardFixture.ts";
import { useDevFailedRead } from "../hooks/useDevFailedRead.ts";
import { DevStateColumn } from "./DevStateColumn.tsx";

export function DevLeaderboardStates() {
  const { failure, isRetrying, retry } = useDevFailedRead();

  return (
    <section aria-label="Leaderboard" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Leaderboard</h2>
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
        <DevStateColumn label="Skeleton">
          <LeaderboardSkeleton withYourPosition />
        </DevStateColumn>
        <DevStateColumn label="Loaded">
          <LeaderboardSections leaderboard={leaderboardFixture} />
        </DevStateColumn>
      </div>
      <DevStateColumn label="Error">
        {isRetrying ? (
          <LoadingState message="Reading the Leaderboard…">
            <LeaderboardSkeleton withYourPosition />
          </LoadingState>
        ) : (
          <ErrorPanel title="Leaderboard" message={failure}>
            <TryAgainKey onRetry={retry} />
          </ErrorPanel>
        )}
      </DevStateColumn>
    </section>
  );
}
