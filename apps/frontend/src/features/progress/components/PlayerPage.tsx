import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { usePlayerPageNickname } from "../hooks/usePlayerPageNickname.ts";
import { PlayerPageGate } from "./PlayerPageGate.tsx";
import { PlayerPanel } from "./PlayerPanel.tsx";
import { PlayerRankCard } from "./PlayerRankCard.tsx";
import { ProgressSection } from "./ProgressSection.tsx";

export function PlayerPage() {
  const nickname = usePlayerPageNickname();

  return (
    <Page>
      <PageHeader title="Player" lead="A Player's Nickname, Ornament, Rank and Progress." />
      <PlayerPageGate nickname={nickname}>
        {(player, progress, isProgressUpdating) => (
          <div className="flex flex-col gap-7 pb-2.5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
              <PlayerPanel player={player} />
              <PlayerRankCard rank={player.rank} />
            </div>
            <ProgressSection
              games={progress.games}
              summary={progress.summary}
              peakTier={player.peakTier}
              isUpdating={isProgressUpdating}
              emptyMessage={`${player.nickname}'s Progress fills as they play Duels.`}
            />
          </div>
        )}
      </PlayerPageGate>
    </Page>
  );
}
