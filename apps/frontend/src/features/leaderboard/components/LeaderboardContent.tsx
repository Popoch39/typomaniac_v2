import { Navigate } from "@tanstack/react-router";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import { useLeaderboard } from "../hooks/useLeaderboard.ts";
import { LeaderboardSections } from "./LeaderboardSections.tsx";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton.tsx";

// Until the reader is known to be a Guest, the skeleton reserves the box of "Your position", so that a
// signed-in reader's Panel never pushes the list down when it arrives.
export function LeaderboardContent() {
  const { gate, isGuest, replacingPage } = useLeaderboard();

  return (
    <ReadGate
      state={gate}
      pending={
        <LoadingState message="Reading the Leaderboard…">
          <LeaderboardSkeleton withYourPosition={!isGuest} />
        </LoadingState>
      }
      title="Leaderboard"
    >
      {(leaderboard) =>
        leaderboard.total === 0 ? (
          <p className="m-0 text-ink-muted">No Player is ranked yet.</p>
        ) : (
          <>
            {replacingPage !== null && (
              <Navigate to="/leaderboard" search={{ page: replacingPage }} replace />
            )}
            <LeaderboardSections leaderboard={leaderboard} />
          </>
        )
      }
    </ReadGate>
  );
}
