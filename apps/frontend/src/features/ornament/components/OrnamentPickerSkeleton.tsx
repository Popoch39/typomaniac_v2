import { Panel } from "../../../shared/components/Panel.tsx";
import { ornamentOptions } from "../picker/ornamentOptions.ts";

// The choices do not depend on the read: their labels stay, and each key keeps the box of its loaded
// key, the `sm` Ornament frame and the unlock hint reserved. The hints are those of a Player with no
// Peak Tier yet, every Tier locked.
const OPTIONS = ornamentOptions(null, null);

/** The Ornament picker at its loaded size, a grid of recessed keys in place of the choices. */
export function OrnamentPickerSkeleton() {
  return (
    <Panel title="Ornament" isLoading>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4 p-0 pb-1">
        {OPTIONS.map(({ choice, label, lockedHint }) => (
          <li key={choice} className="flex">
            <span className="flex min-h-11 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-key-outline bg-surface-plate px-4 py-3 font-display text-base leading-none text-ink-subtle">
              <span className="h-19 w-16 shrink-0" />
              <span className="font-extrabold">{label}</span>
              {lockedHint && (
                <span className="invisible type-mono-sm text-center normal-case">{lockedHint}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
