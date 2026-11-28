import { useQueueEntry } from "../hooks/useQueueEntry.ts";
import { useUnfinishedRankedDuel } from "../hooks/useUnfinishedRankedDuel.ts";
import { PairedDuelStatus } from "./PairedDuelStatus.tsx";
import { PairingPrompt } from "./PairingPrompt.tsx";
import { QueueIdle } from "./QueueIdle.tsx";
import { QueueWaiting } from "./QueueWaiting.tsx";
import { UnfinishedRankedDuel } from "./UnfinishedRankedDuel.tsx";

export function QueuePanel() {
  const { enter, shown } = useQueueEntry();
  const unfinishedDuelId = useUnfinishedRankedDuel();

  if (shown === "queued") return <QueueWaiting />;
  if (shown === "proposed") return <PairingPrompt />;
  if (shown === "paired") return <PairedDuelStatus />;
  if (unfinishedDuelId !== null) return <UnfinishedRankedDuel duelId={unfinishedDuelId} />;
  return <QueueIdle enter={enter} isEntering={shown === "connecting"} />;
}
