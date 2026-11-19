import { Panel } from "../../../shared/components/Panel.tsx";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import { StandingGate } from "../../ranked/components/StandingGate.tsx";

interface PlayerProfileProps {
  player: SignedInPlayer;
}

export function PlayerProfile({ player }: PlayerProfileProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
      <Panel title="Player">
        <div className="flex items-center gap-6 pb-1">
          <PlayerAvatar player={player} isOwn className="size-24 text-4xl" />
          <p className="m-0 type-card-title wrap-anywhere text-ink normal-case">
            <PlayerNickname player={player} />
          </p>
        </div>
      </Panel>
      <StandingGate player={player}>{(standing) => <RankCard standing={standing} />}</StandingGate>
    </div>
  );
}
