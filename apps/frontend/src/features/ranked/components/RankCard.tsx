import { Panel } from "../../../shared/components/Panel.tsx";
import type { VisibleStanding } from "../standing/describeStanding.ts";
import { PlacementSummary } from "./PlacementSummary.tsx";
import { RankSummary } from "./RankSummary.tsx";

interface RankCardProps {
  standing: VisibleStanding;
}

export function RankCard({ standing }: RankCardProps) {
  return (
    <Panel title="Your Rank" tag={standing.rank === null ? "Placement" : undefined}>
      {standing.rank === null ? (
        <PlacementSummary placement={standing.placement} />
      ) : (
        <RankSummary rank={standing.rank} />
      )}
    </Panel>
  );
}
