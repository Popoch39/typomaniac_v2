import { cn } from "../../../shared/lib/utils.ts";
import { usePlacementPips } from "../hooks/usePlacementPips.ts";

interface PlacementPipsProps {
  played: number;
  total: number;
}

export function PlacementPips({ played, total }: PlacementPipsProps) {
  const pips = usePlacementPips(played, total);

  return (
    <ol
      aria-label="Placement Duels"
      className="m-0 grid list-none gap-2.5 p-0 pb-1.5"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {pips.map(({ number, isPlayed }) => (
        <li
          key={number}
          aria-label={isPlayed ? `Duel ${number}, played` : `Duel ${number}, not played yet`}
          className={cn(
            "keycap grid h-14 place-items-center rounded-md font-display text-[22px]",
            isPlayed ? "bg-key-face text-ink" : "bg-surface-plate text-ink-subtle",
          )}
        >
          {number}
        </li>
      ))}
    </ol>
  );
}
