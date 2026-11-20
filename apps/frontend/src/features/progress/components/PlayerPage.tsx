import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { usePlayerPageNickname } from "../hooks/usePlayerPageNickname.ts";
import { PlayerPageGate } from "./PlayerPageGate.tsx";
import { PlayerPanel } from "./PlayerPanel.tsx";
import { PlayerRankCard } from "./PlayerRankCard.tsx";

export function PlayerPage() {
  const nickname = usePlayerPageNickname();

  return (
    <Page>
      <PageHeader title="Player" lead="A Player's Nickname, Ornament and Rank." />
      <PlayerPageGate nickname={nickname}>
        {(player) => (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
            <PlayerPanel player={player} />
            <PlayerRankCard rank={player.rank} />
          </div>
        )}
      </PlayerPageGate>
    </Page>
  );
}
