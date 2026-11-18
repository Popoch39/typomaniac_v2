import { useQueueEntry } from "../hooks/useQueueEntry.ts";
import { EnterQueueButton } from "./EnterQueueButton.tsx";
import { QueueNotice } from "./QueueNotice.tsx";
import { QueueWaiting } from "./QueueWaiting.tsx";

export function QueuePanel() {
  const { enter, isQueued, isEntering } = useQueueEntry();

  if (isQueued) return <QueueWaiting />;
  return (
    <>
      <QueueNotice />
      <EnterQueueButton enter={enter} isEntering={isEntering} />
    </>
  );
}
