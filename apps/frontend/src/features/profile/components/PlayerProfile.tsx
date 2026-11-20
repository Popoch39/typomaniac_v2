import { Panel } from "../../../shared/components/Panel.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { OrnamentPicker } from "../../ornament/components/OrnamentPicker.tsx";
import { ProgressSection } from "../../progress/components/ProgressSection.tsx";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import { ProfileGate } from "./ProfileGate.tsx";

interface PlayerProfileProps {
  player: SignedInPlayer;
}

export function PlayerProfile({ player }: PlayerProfileProps) {
  return (
    <ProfileGate player={player}>
      {(standing, games, isProgressUpdating) => (
        <div className="flex flex-col gap-7 pb-2.5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
            <Panel title="Player">
              <div className="flex items-center gap-6 pb-1">
                <OrnamentedAvatar player={player} ornament={player.ornament} size="lg" isOwn />
                <p className="m-0 type-card-title wrap-anywhere text-ink normal-case">
                  <PlayerNickname player={player} />
                </p>
              </div>
            </Panel>
            <RankCard standing={standing} />
            {/* Choosing an Ornament takes a Nickname, like everything shown to other Players: one without is
          told so rather than offered the picker. */}
            {player.nickname === null ? (
              <Panel title="Ornament">
                <p className="m-0 text-ink-muted">Choose a Nickname to choose an Ornament.</p>
              </Panel>
            ) : (
              <OrnamentPicker player={player} />
            )}
          </div>
          {/* The Progress is found by Nickname, as it is public: one without is told to choose one. */}
          {games === null ? (
            <Panel title="Progress">
              <p className="m-0 text-ink-muted">Choose a Nickname to see your Progress.</p>
            </Panel>
          ) : (
            <ProgressSection
              games={games}
              isUpdating={isProgressUpdating}
              emptyMessage="Your Progress fills as you play Duels."
            />
          )}
        </div>
      )}
    </ProfileGate>
  );
}
