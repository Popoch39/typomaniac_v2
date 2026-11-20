import { useDuelReconnecting } from "../hooks/useDuelReconnecting.ts";
import { DuelReconnectingLine } from "./DuelReconnectingLine.tsx";

// Laid over the screen the socket dropped on, below the typing area, so that it hides and moves
// nothing; it lets clicks through to what is under it.
export function DuelReconnecting() {
  const isReconnecting = useDuelReconnecting();

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2">
      <DuelReconnectingLine isReconnecting={isReconnecting} />
    </div>
  );
}
