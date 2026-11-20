import { Panel } from "../../../shared/components/Panel.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";

interface PlayerPanelProps {
  player: SignedInPlayer;
}

export function PlayerPanel({ player }: PlayerPanelProps) {
  return (
    <Panel title="Player">
      <div className="flex items-center gap-6 pb-1">
        <OrnamentedAvatar player={player} ornament={player.ornament} size="lg" isOwn />
        <p className="m-0 type-card-title wrap-anywhere text-ink normal-case">
          <PlayerNickname player={player} />
        </p>
      </div>
    </Panel>
  );
}
