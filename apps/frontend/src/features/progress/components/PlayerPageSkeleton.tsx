import { RankCardSkeleton } from "../../ranked/components/RankCardSkeleton.tsx";
import { PlayerPanelSkeleton } from "../../profile/components/PlayerPanelSkeleton.tsx";

/** The Player and Rank Panels of a Player's page, with recessed blocks in place of the Player's data. */
export function PlayerPageSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
      <PlayerPanelSkeleton />
      <RankCardSkeleton title="Rank" />
    </div>
  );
}
