import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { usePlayerPageNickname } from "../hooks/usePlayerPageNickname.ts";
import { PlayerPageGate } from "./PlayerPageGate.tsx";
import { PlayerPageSkeleton } from "./PlayerPageSkeleton.tsx";
import { PlayerPanel } from "./PlayerPanel.tsx";
import { PlayerRankCard } from "./PlayerRankCard.tsx";
import { ProgressSection } from "../../progress/components/ProgressSection.tsx";
import { AddFriendSlot } from "../../friends/components/AddFriendSlot.tsx";

export function PlayerPage() {
  const nickname = usePlayerPageNickname();

  return (
    <Page>
      <PageHeader title="Player" />
      <PlayerPageGate
        nickname={nickname}
        pending={
          <LoadingState message="Reading this Player…">
            <PlayerPageSkeleton />
          </LoadingState>
        }
      >
        {(player, progress, isProgressUpdating, addFriend) => (
          <div className="flex flex-col gap-7 pb-2.5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
              <PlayerPanel player={player} action={<AddFriendSlot target={addFriend} />} />
              <PlayerRankCard rank={player.rank} />
            </div>
            <ProgressSection
              progress={progress}
              isUpdating={isProgressUpdating}
              emptyMessage={`${player.nickname}'s Progress fills as they play Duels.`}
              isUnranked={player.rank === null}
            />
          </div>
        )}
      </PlayerPageGate>
    </Page>
  );
}
