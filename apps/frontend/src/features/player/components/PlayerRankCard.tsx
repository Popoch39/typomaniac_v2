import { Panel } from "../../../shared/components/Panel.tsx";
import { RankSummary } from "../../ranked/components/RankSummary.tsx";
import { UnrankedSummary } from "./UnrankedSummary.tsx";
import type { PublicPlayer } from "../hooks/usePlayerPageReads.ts";

interface PlayerRankCardProps {
  rank: PublicPlayer["rank"];
}

// Another Player's Placement is theirs alone: an Unranked Player shows as Unranked, nothing more.
export function PlayerRankCard({ rank }: PlayerRankCardProps) {
  return (
    <Panel title="Rank">{rank === null ? <UnrankedSummary /> : <RankSummary rank={rank} />}</Panel>
  );
}
