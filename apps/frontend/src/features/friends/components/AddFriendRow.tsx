import { ADD_FRIEND_LABELS, type Relation } from "../relation/addFriendKey.ts";
import { useAddFriendKey } from "../hooks/useAddFriendKey.ts";
import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendsPlayerRow } from "./FriendsPlayerRow.tsx";

interface AddFriendRowProps {
  player: ListedPlayer & { relation: Relation };
}

/** A search result, with the key its relation to the signed-in Player offers. */
export function AddFriendRow({ player }: AddFriendRowProps) {
  const { label, disabled, press, failure } = useAddFriendKey(player);
  return (
    <FriendsPlayerRow player={player} failure={failure}>
      <FriendActionKey
        labels={ADD_FRIEND_LABELS}
        label={label}
        disabled={disabled}
        onPress={press}
        variant="action"
      />
    </FriendsPlayerRow>
  );
}
