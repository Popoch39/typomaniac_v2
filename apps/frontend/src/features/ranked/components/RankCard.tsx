import { Panel } from "../../../shared/components/Panel.tsx";
import type { OwnStanding } from "../standing/describeStanding.ts";
import { PlacementSummary } from "./PlacementSummary.tsx";
import { RankSummary } from "./RankSummary.tsx";

interface RankCardProps {
  standing: OwnStanding;
}

export function RankCard({ standing }: RankCardProps) {
  return (
    // The tag keeps its room once the Rank is revealed, so that the card is as tall as its skeleton.
    <Panel title="Your Rank" tag="Placement" isTagHidden={standing.rank !== null}>
      {standing.rank === null ? (
        <PlacementSummary placement={standing.placement} />
      ) : (
        <RankSummary rank={standing.rank} />
      )}
    </Panel>
  );
}
