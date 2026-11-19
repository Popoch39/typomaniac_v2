import { Panel } from "../../../shared/components/Panel.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useQueuePanelTag } from "../hooks/useQueuePanelTag.ts";
import { QueuePanel } from "./QueuePanel.tsx";

interface RankedQueueProps {
  player: SignedInPlayer;
}

// The Queue is for a Player with a Nickname: one without is told so rather than offered the key.
export function RankedQueue({ player }: RankedQueueProps) {
  const tag = useQueuePanelTag();

  return (
    <Panel title="Queue" tag={tag}>
      {player.nickname === null ? (
        <p className="m-0 text-ink-muted">Choose a Nickname to enter the Queue.</p>
      ) : (
        <QueuePanel />
      )}
    </Panel>
  );
}
