import { Panel } from "../../../shared/components/Panel.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useOwnPlace } from "../hooks/useOwnPlace.ts";
import { OwnRankedPlace } from "./OwnRankedPlace.tsx";

interface OwnPlaceProps {
  own: LeaderboardPlayer | null;
}

export function OwnPlace({ own }: OwnPlaceProps) {
  const place = useOwnPlace(own);
  if (place.kind === "guest") return null;
  if (place.kind === "ranked") {
    return (
      <Panel title="Your position" tag={place.name} flat>
        <OwnRankedPlace own={place.own} name={place.name} progress={place.progress} />
      </Panel>
    );
  }

  return (
    <Panel title="Your position" tag="Placement" flat>
      <div className="flex flex-wrap items-center gap-5">
        <TierBadge tier="unranked" size="sm" />
        <p className="m-0 flex-[1_1_260px] text-ink-muted">
          You will appear on the Leaderboard once your Placement is over.
        </p>
      </div>
    </Panel>
  );
}
