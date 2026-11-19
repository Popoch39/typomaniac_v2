import type { Outcome } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import { usePlacementPips } from "../hooks/usePlacementPips.ts";

interface PlacementPipsProps {
  outcomes: readonly Outcome[];
  total: number;
}

const outcomeLabel = { win: "won", loss: "lost", draw: "drawn" } as const;

const outcomeKey = {
  win: "bg-action text-on-key [--keycap-edge:var(--action-edge)]",
  loss: "bg-danger text-on-key [--keycap-edge:var(--danger-edge)]",
  draw: "bg-key-face text-ink",
} as const;

export function PlacementPips({ outcomes, total }: PlacementPipsProps) {
  const pips = usePlacementPips(outcomes, total);

  return (
    <ol
      aria-label="Placement Duels"
      className="m-0 grid list-none gap-2.5 p-0 pb-1.5"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {pips.map(({ number, outcome }) => (
        <li
          key={number}
          aria-label={
            outcome === null
              ? `Duel ${number}, not played yet`
              : `Duel ${number}, ${outcomeLabel[outcome]}`
          }
          className={cn(
            "keycap grid h-14 place-items-center rounded-md font-display text-[22px]",
            outcome === null ? "bg-surface-plate text-ink-subtle" : outcomeKey[outcome],
          )}
        >
          {number}
        </li>
      ))}
    </ol>
  );
}
