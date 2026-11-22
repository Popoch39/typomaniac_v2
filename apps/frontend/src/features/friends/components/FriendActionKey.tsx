import { Keycap } from "../../../shared/components/Keycap.tsx";
import { cn } from "../../../shared/lib/utils.ts";

interface FriendActionKeyProps {
  /** Every label the key may show, so that it keeps the size of the longest. */
  labels: readonly string[];
  label: string;
  disabled: boolean;
  onPress: () => void;
  variant?: "neutral" | "action";
}

export function FriendActionKey({
  labels,
  label,
  disabled,
  onPress,
  variant = "neutral",
}: FriendActionKeyProps) {
  return (
    <Keycap type="button" variant={variant} size="sm" onClick={onPress} disabled={disabled}>
      {/* Every label stacked in one cell, the hidden ones keeping the key at the longest's size. */}
      <span aria-live="polite" className="grid">
        {labels.map((each) => (
          <span key={each} className={cn("col-start-1 row-start-1", each !== label && "invisible")}>
            {each}
          </span>
        ))}
      </span>
    </Keycap>
  );
}
