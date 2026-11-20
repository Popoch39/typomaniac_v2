import { Panel } from "../../../shared/components/Panel.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { OrnamentPicker } from "../../ornament/components/OrnamentPicker.tsx";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";
import { PlayerPanel } from "./PlayerPanel.tsx";

interface PlayerProfileProps {
  player: SignedInPlayer;
  standing: OwnStanding;
}

export function PlayerProfile({ player, standing }: PlayerProfileProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
      <PlayerPanel player={player} />
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
  );
}
