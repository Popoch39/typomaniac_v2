import { ADD_FRIEND_LABELS } from "../relation/addFriendKey.ts";
import type { AddFriendTarget } from "../relation/addFriendTarget.ts";
import { AddFriendKeycap } from "./AddFriendKeycap.tsx";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendKeyFailure } from "./FriendKeyFailure.tsx";

interface AddFriendSlotProps {
  target: AddFriendTarget;
  size?: "sm" | "lg";
  failureAlign?: "center" | "end";
  /** Keeps the key's box even when no key shows, where its going would move what is beside it. */
  reserve?: boolean;
}

/**
 * The Add Friend key on another Player, or the box it keeps while their relation is read, with why
 * under it when the relation could not be read.
 */
export function AddFriendSlot({ target, size, failureAlign, reserve = false }: AddFriendSlotProps) {
  if (target.kind === "key")
    return <AddFriendKeycap player={target.player} size={size} failureAlign={failureAlign} />;
  if (target.kind === "none" && !reserve) return null;
  return (
    <div className="relative">
      <div aria-hidden="true" className="invisible">
        <FriendActionKey labels={ADD_FRIEND_LABELS} label="Add Friend" disabled size={size} />
      </div>
      {target.kind === "failed" && (
        <FriendKeyFailure failure={target.failure} align={failureAlign} />
      )}
    </div>
  );
}
