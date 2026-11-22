import { LoadingPixels } from "../../../shared/components/LoadingPixels.tsx";
import { useDuelReconnecting } from "../hooks/useDuelReconnecting.ts";

// Laid over the Target words, so that they move nothing, and shows why typing is frozen. Hidden from
// assistive technology: the Reconnecting line already announces it.
export function DuelReconnectingVeil() {
  if (!useDuelReconnecting()) return null;
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center gap-3 text-ink backdrop-blur-[4px]"
    >
      <LoadingPixels size="sm" />
      <p className="m-0 type-status">Reconnecting…</p>
    </div>
  );
}
