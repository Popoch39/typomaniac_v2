import { Navigate } from "@tanstack/react-router";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { useLeaderboard } from "../hooks/useLeaderboard.ts";
import { AllRankedPlayers } from "./AllRankedPlayers.tsx";
import { LeaderboardPodium } from "./LeaderboardPodium.tsx";
import { YourPosition } from "./YourPosition.tsx";

export function LeaderboardContent() {
  const { leaderboard, isPending, failure, replacingPage } = useLeaderboard();

  if (isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading the Leaderboard…" />;
  }
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (leaderboard === null) return null;
  if (leaderboard.total === 0)
    return <p className="m-0 text-ink-muted">No Player is ranked yet.</p>;
  return (
    <>
      {replacingPage !== null && (
        <Navigate to="/leaderboard" search={{ page: replacingPage }} replace />
      )}
      <LeaderboardPodium podium={leaderboard.podium} own={leaderboard.own} />
      <YourPosition own={leaderboard.own} />
      <AllRankedPlayers leaderboard={leaderboard} />
    </>
  );
}
