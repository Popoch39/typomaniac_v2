import type { OrnamentChoice } from "@repo/ranked-engine";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { OrnamentOption } from "../picker/ornamentOptions.ts";
import { OrnamentedAvatar } from "./OrnamentedAvatar.tsx";

interface OrnamentPickerOptionProps {
  player: SignedInPlayer;
  option: OrnamentOption;
  isChosen: boolean;
  isSaving: boolean;
  onChoose: (choice: OrnamentChoice) => void;
}

// A locked Ornament stays in the list, greyed out, with what it takes to unlock it.
export function OrnamentPickerOption({
  player,
  option: { choice, label, preview, lockedHint, unlockHint },
  isChosen,
  isSaving,
  onChoose,
}: OrnamentPickerOptionProps) {
  return (
    <Keycap
      variant={isChosen ? "action" : "neutral"}
      size="sm"
      aria-pressed={isChosen}
      disabled={lockedHint !== null || isSaving}
      onClick={() => onChoose(choice)}
      className="h-auto w-full flex-col gap-2 py-3 whitespace-normal"
    >
      <OrnamentedAvatar player={player} ornament={preview} size="sm" isOwn />
      <span className="font-extrabold">{label}</span>
      {/* An open Tier keeps its hint's room, hidden, so that every key is as tall whatever the Peak
      Tier, and as tall as its skeleton. */}
      {unlockHint && (
        <span
          className={cn("type-mono-sm text-center normal-case", lockedHint === null && "invisible")}
        >
          {unlockHint}
        </span>
      )}
    </Keycap>
  );
}
