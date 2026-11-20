import { Panel } from "../../../shared/components/Panel.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { OrnamentPicker } from "../../ornament/components/OrnamentPicker.tsx";
import { ProgressSection } from "../../progress/components/ProgressSection.tsx";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";
import type { ProfileProgress } from "../hooks/useProfileReads.ts";
import { PlayerPanel } from "../../player/components/PlayerPanel.tsx";

interface PlayerProfileProps {
  player: SignedInPlayer;
  standing: OwnStanding;
  /** Null for a Player without a Nickname, whose Progress is not read. */
  progress: ProfileProgress | null;
  /** The Progress shown is that of the previous period or kind, while the chosen one is read. */
  isProgressUpdating: boolean;
}

export function PlayerProfile({
  player,
  standing,
  progress,
  isProgressUpdating,
}: PlayerProfileProps) {
  return (
    <div className="flex flex-col gap-7 pb-2.5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7">
        <PlayerPanel player={player} isOwn />
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
      {progress === null ? (
        <Panel title="Progress">
          <p className="m-0 text-ink-muted">Choose a Nickname to see your Progress.</p>
        </Panel>
      ) : (
        <ProgressSection
          games={progress.games}
          summary={progress.summary}
          peakTier={progress.peakTier}
          isUpdating={isProgressUpdating}
          emptyMessage="Your Progress fills as you play Duels."
          rankPoints={progress.rankPoints}
          isUnranked={standing.rank === null}
        />
      )}
    </div>
  );
}
