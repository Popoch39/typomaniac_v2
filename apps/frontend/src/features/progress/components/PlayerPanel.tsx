import { Panel } from "../../../shared/components/Panel.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { PublicPlayer } from "../hooks/usePlayerPageReads.ts";

interface PlayerPanelProps {
  player: PublicPlayer;
}

export function PlayerPanel({ player }: PlayerPanelProps) {
  return (
    <Panel title="Player">
      <div className="flex items-center gap-6 pb-1">
        <OrnamentedAvatar player={player} ornament={player.ornament} size="lg" />
        <p className="m-0 type-card-title wrap-anywhere text-ink normal-case">{player.nickname}</p>
      </div>
    </Panel>
  );
}
