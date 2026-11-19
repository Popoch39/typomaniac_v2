import { Keycap } from "../../../shared/components/Keycap.tsx";
import { FindDuelIcon } from "./FindDuelIcon.tsx";

interface EnterQueueButtonProps {
  enter: () => void;
  isEntering: boolean;
}

export function EnterQueueButton({ enter, isEntering }: EnterQueueButtonProps) {
  return (
    <div className="pb-2">
      <Keycap
        type="button"
        variant="brand"
        size="xl"
        onClick={enter}
        disabled={isEntering}
        className="w-full"
      >
        <FindDuelIcon />
        {isEntering ? "Entering the Queue…" : "Find a Duel"}
      </Keycap>
    </div>
  );
}
