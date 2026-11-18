import { Button } from "../../../shared/components/ui/button.tsx";
import { useQueueWaiting } from "../hooks/useQueueWaiting.ts";

export function QueueWaiting() {
  const { status, waitingTime, leave } = useQueueWaiting();

  return (
    <>
      <p role="status" className="text-base">
        {status}
      </p>
      <p role="timer" aria-label="Time waited in the Queue" className="font-heading text-2xl">
        {waitingTime}
      </p>
      <Button type="button" variant="outline" onClick={leave}>
        Leave the Queue
      </Button>
    </>
  );
}
