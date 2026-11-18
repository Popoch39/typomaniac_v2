import { Button } from "../../../shared/components/ui/button.tsx";
import { useQueueWaiting } from "../hooks/useQueueWaiting.ts";

export function QueueWaiting() {
  const { waitingTime, leave } = useQueueWaiting();

  return (
    <>
      <p role="status" className="text-base">
        You are in the Queue, looking for an Opponent.
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
