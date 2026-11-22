import type { Ornament } from "@repo/ranked-engine";
import type { ReactNode } from "react";
import { Panel } from "../../../shared/components/Panel.tsx";
import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";

interface PlayerPanelProps {
  player: AvatarPlayer & { ornament: Ornament };
  /** The signed-in Player's own Panel, on their Profile. */
  isOwn?: boolean;
  /** What the reader may do with this Player, at the end of the row. */
  action?: ReactNode;
}

export function PlayerPanel({ player, isOwn = false, action }: PlayerPanelProps) {
  return (
    <Panel title="Player">
      <div className="flex items-center gap-6 pb-1">
        <OrnamentedAvatar player={player} ornament={player.ornament} size="lg" isOwn={isOwn} />
        <p className="m-0 type-card-title wrap-anywhere text-ink normal-case">
          <PlayerNickname player={player} />
        </p>
        <div className="ml-auto shrink-0">{action}</div>
      </div>
    </Panel>
  );
}
