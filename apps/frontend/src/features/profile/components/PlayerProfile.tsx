import { Panel } from "../../../shared/components/Panel.tsx";
import { ChooseNicknameNotice } from "../../auth/components/ChooseNicknameNotice.tsx";
import { OrnamentPicker } from "../../ornament/components/OrnamentPicker.tsx";
import { ProgressSection } from "../../progress/components/ProgressSection.tsx";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import type { Profile } from "../hooks/useProfileReads.ts";
import { PlayerPanel } from "../../player/components/PlayerPanel.tsx";

interface PlayerProfileProps {
  profile: Profile;
}

export function PlayerProfile({ profile }: PlayerProfileProps) {
  const { player, standing } = profile;

  return (
    <div className="flex flex-col gap-7 pb-2.5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
        <PlayerPanel player={player} isOwn />
        <RankCard standing={standing} />
        {/* Choosing an Ornament takes a Nickname, like everything shown to other Players. */}
        {profile.kind === "named" ? (
          <OrnamentPicker player={player} />
        ) : (
          <Panel title="Ornament">
            <ChooseNicknameNotice purpose="choose an Ornament" />
          </Panel>
        )}
      </div>
      {/* The Progress is found by Nickname, as it is public. */}
      {profile.kind === "named" ? (
        <ProgressSection
          progress={profile.progress}
          isUpdating={profile.isProgressUpdating}
          emptyMessage="Your Progress fills as you play Duels."
          isUnranked={standing.rank === null}
        />
      ) : (
        <Panel title="Progress">
          <ChooseNicknameNotice purpose="see your Progress" />
        </Panel>
      )}
    </div>
  );
}
