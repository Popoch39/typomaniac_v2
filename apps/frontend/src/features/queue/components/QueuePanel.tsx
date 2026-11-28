import { useQueueEntry } from "../hooks/useQueueEntry.ts";
import { useUnfinishedRankedDuel } from "../hooks/useUnfinishedRankedDuel.ts";
import { PairingPrompt } from "./PairingPrompt.tsx";
import { QueueIdle } from "./QueueIdle.tsx";
import { QueueStatusLine } from "./QueueStatusLine.tsx";
import { QueueWaiting } from "./QueueWaiting.tsx";
import { UnfinishedRankedDuel } from "./UnfinishedRankedDuel.tsx";

export function QueuePanel() {
  const { enter, shown } = useQueueEntry();
  const unfinishedDuelId = useUnfinishedRankedDuel();

  if (shown === "queued") return <QueueWaiting />;
  if (shown === "proposed") return <PairingPrompt />;
  // The Queue store takes the Player to the ranked Duel, from whatever page they are on.
  if (shown === "paired")
    return <QueueStatusLine message="Both accepted. Taking you to the Duel…" />;
  if (unfinishedDuelId !== null) return <UnfinishedRankedDuel duelId={unfinishedDuelId} />;
  return <QueueIdle enter={enter} isEntering={shown === "connecting"} />;
}
