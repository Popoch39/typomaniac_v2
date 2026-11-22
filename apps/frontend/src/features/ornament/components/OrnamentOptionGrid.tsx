import type { OrnamentChoice } from "@repo/ranked-engine";
import type { SignedInPlayer } from "../../auth/session/sessionOf.ts";
import type { OrnamentOption } from "../picker/ornamentOptions.ts";
import { OrnamentPickerOption } from "./OrnamentPickerOption.tsx";

interface OrnamentOptionGridProps {
  player: SignedInPlayer;
  options: readonly OrnamentOption[];
  chosen: OrnamentChoice | null;
  isSaving: boolean;
  onChoose: (choice: OrnamentChoice) => void;
}

export function OrnamentOptionGrid({
  player,
  options,
  chosen,
  isSaving,
  onChoose,
}: OrnamentOptionGridProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4 p-0 pb-1">
      {options.map((option) => (
        <li key={option.choice} className="flex">
          <OrnamentPickerOption
            player={player}
            option={option}
            isChosen={option.choice === chosen}
            isSaving={isSaving}
            onChoose={onChoose}
          />
        </li>
      ))}
    </ul>
  );
}
