import { useQueueEntry } from "../hooks/useQueueEntry.ts";
import { useUnfinishedRankedDuel } from "../hooks/useUnfinishedRankedDuel.ts";
import { PairedDuelRedirect } from "./PairedDuelRedirect.tsx";
import { PairingPrompt } from "./PairingPrompt.tsx";
import { QueueIdle } from "./QueueIdle.tsx";
import { QueueWaiting } from "./QueueWaiting.tsx";
import { UnfinishedRankedDuel } from "./UnfinishedRankedDuel.tsx";

export function QueuePanel() {
  const { enter, isQueued, isProposed, isPaired, isEntering } = useQueueEntry();
  const unfinishedDuelId = useUnfinishedRankedDuel();

  if (isQueued) return <QueueWaiting />;
  if (isProposed) return <PairingPrompt />;
  if (isPaired) return <PairedDuelRedirect />;
  if (unfinishedDuelId !== null) return <UnfinishedRankedDuel duelId={unfinishedDuelId} />;
  return <QueueIdle enter={enter} isEntering={isEntering} />;
}
