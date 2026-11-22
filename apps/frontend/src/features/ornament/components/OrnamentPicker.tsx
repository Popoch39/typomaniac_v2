import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import type { SignedInPlayer } from "../../auth/session/sessionOf.ts";
import { useOrnamentPicker } from "../hooks/useOrnamentPicker.ts";
import { OrnamentOptionGrid } from "./OrnamentOptionGrid.tsx";
import { OrnamentPickerSkeleton } from "./OrnamentPickerSkeleton.tsx";

interface OrnamentPickerProps {
  player: SignedInPlayer;
}

export function OrnamentPicker({ player }: OrnamentPickerProps) {
  const { stage, readFailure, retry, chosen, options, choose, isSaving, saveFailure } =
    useOrnamentPicker(player);

  if (stage === "loading") {
    return (
      <LoadingState message="Reading your Ornaments…">
        <OrnamentPickerSkeleton />
      </LoadingState>
    );
  }
  if (stage === "failed" && readFailure !== null) {
    return (
      <ErrorPanel title="Ornament" message={readFailure}>
        <TryAgainKey onRetry={retry} />
      </ErrorPanel>
    );
  }
  return (
    <Panel title="Ornament" tag="Saving…" isTagHidden={!isSaving}>
      <OrnamentOptionGrid
        player={player}
        options={options}
        chosen={chosen}
        isSaving={isSaving}
        onChoose={choose}
      />
      <DangerStatusLine message={saveFailure} />
    </Panel>
  );
}
