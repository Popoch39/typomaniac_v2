import { Panel } from "../../../shared/components/Panel.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useYourPosition } from "../hooks/useYourPosition.ts";
import { OwnRankedPosition } from "./OwnRankedPosition.tsx";

interface YourPositionContentProps {
  own: LeaderboardPlayer | null;
}

export function YourPositionContent({ own }: YourPositionContentProps) {
  const view = useYourPosition(own);
  if (view.kind === "guest") return null;
  if (view.kind === "ranked") {
    return (
      <Panel title="Your position" tag={view.name} flat>
        <OwnRankedPosition own={view.own} name={view.name} progress={view.progress} />
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
