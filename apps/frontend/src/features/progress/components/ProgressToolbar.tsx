import { useProgressToolbar } from "../hooks/useProgressToolbar.ts";
import { ProgressChoiceKeys } from "./ProgressChoiceKeys.tsx";

/** The period and the kind of Duels every chart of the Progress follows. */
export function ProgressToolbar() {
  const { windows, kinds, window, kind, chooseWindow, chooseKind } = useProgressToolbar();

  return (
    <div className="flex flex-wrap items-end gap-x-12 gap-y-5">
      <ProgressChoiceKeys
        label="Period"
        options={windows}
        chosen={window}
        onChoose={chooseWindow}
      />
      <ProgressChoiceKeys label="Duels" options={kinds} chosen={kind} onChoose={chooseKind} />
    </div>
  );
}
