import { LoadingPixels } from "../../../shared/components/LoadingPixels.tsx";
import { cn } from "../../../shared/lib/utils.ts";

interface DuelReconnectingLineProps {
  isReconnecting: boolean;
}

// Always rendered, so that its live region is there before it speaks, and at the same width either
// way: only the words are announced, the pixels are hidden from assistive technology.
export function DuelReconnectingLine({ isReconnecting }: DuelReconnectingLineProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border-2 border-key-outline bg-surface-plate px-4 py-2.5 text-ink",
        !isReconnecting && "invisible",
      )}
    >
      <LoadingPixels size="sm" />
      <p role="status" className="m-0 min-w-[14ch] type-status whitespace-nowrap">
        {isReconnecting && "Reconnecting…"}
      </p>
    </div>
  );
}
