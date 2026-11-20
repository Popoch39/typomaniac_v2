import { Navigate } from "@tanstack/react-router";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import { useLeaderboard } from "../hooks/useLeaderboard.ts";
import { LeaderboardSections } from "./LeaderboardSections.tsx";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton.tsx";

// The skeleton waits for the session, which decides whether it lays out "Your position": guessing
// would make the list below it jump when the session arrives.
export function LeaderboardContent() {
  const { leaderboard, stage, isSessionKnown, isSignedIn, failure, retry, replacingPage } =
    useLeaderboard();

  if (stage === "loading") {
    return (
      <LoadingState message="Reading the Leaderboard…">
        {isSessionKnown && <LeaderboardSkeleton withYourPosition={isSignedIn} />}
      </LoadingState>
    );
  }
  if (stage === "failed" && failure !== null) {
    return (
      <ErrorPanel title="Leaderboard" message={failure}>
        <TryAgainKey onRetry={retry} />
      </ErrorPanel>
    );
  }
  if (leaderboard === null) return null;
  if (leaderboard.total === 0)
    return <p className="m-0 text-ink-muted">No Player is ranked yet.</p>;
  return (
    <>
      {replacingPage !== null && (
        <Navigate to="/leaderboard" search={{ page: replacingPage }} replace />
      )}
      <LeaderboardSections leaderboard={leaderboard} />
    </>
  );
}
