import { useDuelLivePoints } from "../hooks/useDuelLivePoints.ts";
import { DuelLiveSide } from "./DuelLiveSide.tsx";

export function DuelLivePoints() {
  const { self, opponent } = useDuelLivePoints();

  return (
    // Each side in the colour of its Participant's caret, the Participant's own first.
    <div className="mb-2 flex gap-12" aria-label="Live Points">
      <DuelLiveSide side={self} className="text-primary" />
      <DuelLiveSide side={opponent} className="text-opponent" />
    </div>
  );
}
