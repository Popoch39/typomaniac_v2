import { cn } from "../../../shared/lib/utils.ts";
import { useOnlinePlayers } from "../hooks/useOnlinePlayers.ts";

/**
 * "12 online", beside a card's title, or a quiet "offline" while the Player socket is down. Both
 * lines share one cell, so the box keeps the size of the wider; it stays in place, blank, while the
 * count is unknown.
 */
export function OnlinePlayers() {
  const { kind, count } = useOnlinePlayers();
  const isDown = kind === "down";

  return (
    <span
      className={cn(
        "grid type-mono-sm whitespace-nowrap text-ink-muted",
        kind !== "live" && !isDown && "invisible",
      )}
    >
      <span
        className={cn("col-start-1 row-start-1 flex items-center gap-1.5", isDown && "invisible")}
      >
        <span aria-hidden className="size-2 rounded-full bg-action" />
        {count ?? 0} online
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1 flex items-center gap-1.5 text-ink-subtle",
          !isDown && "invisible",
        )}
      >
        <span aria-hidden className="size-2 rounded-full border border-current" />
        offline
      </span>
    </span>
  );
}
