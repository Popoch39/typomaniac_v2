import { Panel } from "../../../shared/components/Panel.tsx";
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
    <Panel title="Your position" flat className="max-w-2xl">
      {place.kind === "unranked" ? (
        <p className="m-0 text-ink-muted">
          You will appear on the Leaderboard once your Placement is over.
        </p>
      ) : (
        <p className="m-0 flex items-baseline gap-4">
          <span className="type-metric-lg text-action">#{place.own.position}</span>
          <span className="font-mono font-bold text-ink-muted">
            <LeaderboardRank player={place.own} />
          </span>
        </p>
      )}
    </Panel>
  );
}
