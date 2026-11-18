import { CircleAlert, LoaderCircle } from "lucide-react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { useLeaderboard } from "../hooks/useLeaderboard.ts";
import { LeaderboardTable } from "./LeaderboardTable.tsx";
import { OwnPlace } from "./OwnPlace.tsx";

export function LeaderboardContent() {
  const { leaderboard, isPending, failure } = useLeaderboard();

  if (isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading the Leaderboard…" />;
  }
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (leaderboard === null) return null;
  return (
    <>
      <OwnPlace own={leaderboard.own} />
      {leaderboard.players.length === 0 ? (
        <p className="text-base text-muted-foreground">No Player is ranked yet.</p>
      ) : (
        <LeaderboardTable players={leaderboard.players} own={leaderboard.own} />
      )}
    </>
  );
}
