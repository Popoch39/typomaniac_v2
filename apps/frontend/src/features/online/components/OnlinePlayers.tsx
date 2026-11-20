import { cn } from "../../../shared/lib/utils.ts";
import { useOnlinePlayers } from "../hooks/useOnlinePlayers.ts";

/** "12 online", beside a card's title; its line stays in place, blank, while the count is unknown. */
export function OnlinePlayers() {
  const players = useOnlinePlayers();

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 type-mono-sm whitespace-nowrap text-ink-muted",
        players === null && "invisible",
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-action" />
      {players ?? 0} online
    </span>
  );
}
