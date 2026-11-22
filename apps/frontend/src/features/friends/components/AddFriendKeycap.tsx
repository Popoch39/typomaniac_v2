import { useAddFriendKey } from "../hooks/useAddFriendKey.ts";
import { ADD_FRIEND_LABELS, type Relation } from "../relation/addFriendKey.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendKeyFailure } from "./FriendKeyFailure.tsx";

interface AddFriendKeycapProps {
  player: { id: string; relation: Relation };
  size?: "sm" | "lg";
  /** Where a failure hangs under the key: centred on it, or from its end edge. */
  failureAlign?: "center" | "end";
}

export function AddFriendKeycap({ player, size, failureAlign = "center" }: AddFriendKeycapProps) {
  const { label, disabled, press, failure } = useAddFriendKey(player);

  return (
    <div className="relative">
      <FriendActionKey
        labels={ADD_FRIEND_LABELS}
        label={label}
        disabled={disabled}
        onPress={press}
        variant="action"
        size={size}
      />
      <FriendKeyFailure failure={failure} align={failureAlign} />
    </div>
  );
}
