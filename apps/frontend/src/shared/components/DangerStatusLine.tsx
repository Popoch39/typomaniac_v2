import { cn } from "../lib/utils.ts";
import { DangerIcon } from "./DangerIcon.tsx";

interface DangerStatusLineProps {
  /** A readable sentence, from `describeApiError`; null while nothing failed. */
  message: string | null;
}

/**
 * An error under a key. Always rendered at the height of two lines, so that its live region is there
 * before it speaks and an error showing or clearing moves nothing; a longer sentence is cut on screen
 * but stays whole in the title tooltip and for screen readers. On the tablet icon rail it shrinks to
 * its icon.
 */
export function DangerStatusLine({ message }: DangerStatusLineProps) {
  const hasFailed = message !== null;

  return (
    <div
      title={message ?? undefined}
      className={cn(
        "flex h-[calc(2lh+0.75rem+4px)] items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        hasFailed ? "border-danger bg-surface-plate" : "border-transparent",
      )}
    >
      <span className={cn("flex", !hasFailed && "invisible")}>
        <DangerIcon />
      </span>
      <p role="alert" className="m-0 line-clamp-2 min-w-0 group-data-[collapsible=icon]:sr-only">
        {message}
      </p>
    </div>
  );
}
