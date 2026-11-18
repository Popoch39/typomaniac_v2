import { Card, CardContent } from "../../../shared/components/ui/card.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useOwnPlace } from "../hooks/useOwnPlace.ts";
import { LeaderboardRank } from "./LeaderboardRank.tsx";

interface OwnPlaceProps {
  own: LeaderboardPlayer | null;
}

export function OwnPlace({ own }: OwnPlaceProps) {
  const place = useOwnPlace(own);
  if (place.kind === "guest") return null;

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="flex items-baseline gap-2 text-base">
        {place.kind === "unranked" ? (
          <p>You will appear on the Leaderboard once your Placement is over.</p>
        ) : (
          <>
            <p>
              Your position: <span className="font-mono text-primary">#{place.own.position}</span>
            </p>
            <p className="text-muted-foreground">
              <LeaderboardRank player={place.own} />
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
