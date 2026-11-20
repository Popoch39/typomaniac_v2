import { OrnamentPickerSkeleton } from "../../ornament/components/OrnamentPickerSkeleton.tsx";
import { RankCardSkeleton } from "../../ranked/components/RankCardSkeleton.tsx";
import { PlayerPanelSkeleton } from "../../player/components/PlayerPanelSkeleton.tsx";

/** The Profile grid at its loaded size, with recessed blocks in place of the Player's data. */
export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
      <PlayerPanelSkeleton />
      <RankCardSkeleton />
      <OrnamentPickerSkeleton />
    </div>
  );
}
