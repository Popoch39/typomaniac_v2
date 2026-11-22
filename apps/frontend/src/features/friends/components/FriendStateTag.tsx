import { cn } from "../../../shared/lib/utils.ts";
import type { FriendState } from "../../online/message/parsePlayerMessage.ts";
import { FRIEND_STATE_LABELS } from "../presence/friendStates.ts";

interface FriendStateTagProps {
  state: FriendState;
  label: string;
}

const DOT: Record<FriendState, string> = {
  online: "bg-action",
  inDuel: "bg-brand",
  offline: "bg-ink-subtle",
};

/** A Friend's state, which changes live in a box of a fixed size. */
export function FriendStateTag({ state, label }: FriendStateTagProps) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-ink-muted">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[state])} />
      {/* Every label stacked in one cell, the hidden ones keeping the tag at the longest's size. */}
      <span aria-live="polite" className="grid">
        {FRIEND_STATE_LABELS.map((each) => (
          <span key={each} className={cn("col-start-1 row-start-1", each !== label && "invisible")}>
            {each}
          </span>
        ))}
      </span>
    </span>
  );
}
