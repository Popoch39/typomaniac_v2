import { CircleAlert, LoaderCircle } from "lucide-react";
import { Panel } from "../../../shared/components/Panel.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useOrnamentPicker } from "../hooks/useOrnamentPicker.ts";
import { OrnamentPickerOption } from "./OrnamentPickerOption.tsx";

interface OrnamentPickerProps {
  player: SignedInPlayer;
}

export function OrnamentPicker({ player }: OrnamentPickerProps) {
  const { isPending, readFailure, chosen, options, choose, isSaving, saveFailure } =
    useOrnamentPicker(player);

  return (
    <Panel title="Ornament" tag="Saving…" isTagHidden={!isSaving}>
      {isPending ? (
        <StatusMessage role="status" icon={LoaderCircle} message="Reading your Ornaments…" />
      ) : readFailure ? (
        <StatusMessage role="alert" icon={CircleAlert} message={readFailure} />
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4 p-0 pb-1">
          {options.map((option) => (
            <li key={option.choice} className="flex">
              <OrnamentPickerOption
                player={player}
                option={option}
                isChosen={option.choice === chosen}
                isSaving={isSaving}
                onChoose={choose}
              />
            </li>
          ))}
        </ul>
      )}
      {saveFailure && <StatusMessage role="alert" icon={CircleAlert} message={saveFailure} />}
    </Panel>
  );
}
