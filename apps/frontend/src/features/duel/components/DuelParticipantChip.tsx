import type { Participant } from "@repo/duel-engine";
import type { ReactNode } from "react";
import { cn } from "../../../shared/lib/utils.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";

interface DuelParticipantChipProps {
  participant: Participant;
  isOwn?: boolean;
  /** What is said of the Participant under their name. */
  children?: ReactNode;
}

// The Avatar in the chip form of the Ornament worn, and the name in the colour of the Participant's caret.
export function DuelParticipantChip({
  participant,
  isOwn = false,
  children,
}: DuelParticipantChipProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <OrnamentedAvatar
        player={{ nickname: participant.name, avatarUrl: participant.avatarUrl }}
        ornament={participant.ornament}
        size="sm"
        isOwn={isOwn}
      />
      <span className="flex min-w-0 flex-col items-start">
        <span className={cn("truncate font-medium", isOwn ? "text-primary" : "text-opponent")}>
          {participant.name}
        </span>
        {children}
      </span>
    </span>
  );
}
