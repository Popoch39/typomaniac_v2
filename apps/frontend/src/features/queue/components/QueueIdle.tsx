import { EnterQueueButton } from "./EnterQueueButton.tsx";
import { QueueNotice } from "./QueueNotice.tsx";

interface QueueIdleProps {
  enter: () => void;
  isEntering: boolean;
}

export function QueueIdle({ enter, isEntering }: QueueIdleProps) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-7">
      <div className="flex flex-col gap-3">
        <p className="m-0 type-headline text-ink">Ready to Duel?</p>
        <p className="m-0 text-pretty text-ink-muted">
          Enter the Queue and get paired with a Player near your Rank.
        </p>
        <QueueNotice />
      </div>
      <EnterQueueButton enter={enter} isEntering={isEntering} />
    </div>
  );
}
