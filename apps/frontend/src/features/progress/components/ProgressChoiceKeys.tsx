import { Keycap } from "../../../shared/components/Keycap.tsx";
import { cn } from "../../../shared/lib/utils.ts";

interface ProgressChoiceKeysProps<Value extends string> {
  label: string;
  options: readonly { value: Value; label: string }[];
  chosen: Value;
  onChoose: (value: Value) => void;
}

// The chosen key stays sunk, as if held down. The row leaves room below for the keys' edge.
export function ProgressChoiceKeys<Value extends string>({
  label,
  options,
  chosen,
  onChoose,
}: ProgressChoiceKeysProps<Value>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2.5 pb-1">
      <span aria-hidden className="mr-1.5 type-eyebrow text-ink-subtle">
        {label}
      </span>
      {options.map((option) => (
        <Keycap
          key={option.value}
          size="sm"
          aria-pressed={option.value === chosen}
          onClick={() => onChoose(option.value)}
          className={cn(option.value === chosen && "keycap-pressed")}
        >
          {option.label}
        </Keycap>
      ))}
    </div>
  );
}
