import type { ReviewedDuel } from "../hooks/useReview.ts";
import { useReviewedDuel } from "../hooks/useReviewedDuel.ts";

interface VoidableDuelChoiceProps {
  duel: ReviewedDuel;
  chosen: boolean;
  disabled: boolean;
  onToggle: () => void;
}

/** A won Duel the administrator may choose to void. */
export function VoidableDuelChoice({ duel, chosen, disabled, onToggle }: VoidableDuelChoiceProps) {
  const { title, detail } = useReviewedDuel(duel);

  return (
    <li>
      <label className="flex cursor-pointer items-baseline gap-3">
        <input
          type="checkbox"
          className="size-4 accent-action"
          checked={chosen}
          disabled={disabled}
          onChange={onToggle}
        />
        <span className="font-bold">{title}</span>
        <span className="text-ink-muted">{detail}</span>
      </label>
    </li>
  );
}
