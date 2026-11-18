import { useQueueEntry } from "../hooks/useQueueEntry.ts";
import { EnterQueueButton } from "./EnterQueueButton.tsx";
import { PairedDuelRedirect } from "./PairedDuelRedirect.tsx";
import { PairingPrompt } from "./PairingPrompt.tsx";
import { QueueNotice } from "./QueueNotice.tsx";
import { QueueWaiting } from "./QueueWaiting.tsx";

export function QueuePanel() {
  const { enter, isQueued, isProposed, isPaired, isEntering } = useQueueEntry();

  if (isQueued) return <QueueWaiting />;
  if (isProposed) return <PairingPrompt />;
  if (isPaired) return <PairedDuelRedirect />;
  return (
    <>
      <QueueNotice />
      <EnterQueueButton enter={enter} isEntering={isEntering} />
    </>
  );
}
