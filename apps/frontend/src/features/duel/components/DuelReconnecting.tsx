import { cn } from "../../../shared/lib/utils.ts";
import { useDuelReconnecting } from "../hooks/useDuelReconnecting.ts";

// Laid over the screen the socket dropped on, so that it moves nothing; always rendered, so that
// its live region is there before it speaks.
export function DuelReconnecting() {
  const isReconnecting = useDuelReconnecting();

  return (
    <p
      role="status"
      className={cn(
        "fixed bottom-6 left-1/2 m-0 -translate-x-1/2 rounded-sm border-2 border-key-outline bg-key-face px-2.5 py-1 type-mono-sm whitespace-nowrap text-ink uppercase",
        !isReconnecting && "invisible",
      )}
    >
      {isReconnecting && "Reconnecting…"}
    </p>
  );
}
