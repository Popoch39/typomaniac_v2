import { cn } from "../../../shared/lib/utils.ts";
import { useAddFriendKey } from "../hooks/useAddFriendKey.ts";
import { ADD_FRIEND_LABELS, type Relation } from "../relation/addFriendKey.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";

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
      {/* Under the key, out of the flow, so that a failure moves nothing around it. */}
      <p
        role="alert"
        className={cn(
          "absolute top-full z-10 m-0 mt-2 whitespace-nowrap text-danger",
          failureAlign === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
        )}
      >
        {failure}
      </p>
    </div>
  );
}
