import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { REMOVE_LABELS, useRemoveFriend } from "../hooks/useRemoveFriend.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendsPlayerRow } from "./FriendsPlayerRow.tsx";

interface FriendRowProps {
  friend: ListedPlayer;
}

export function FriendRow({ friend }: FriendRowProps) {
  const { label, disabled, remove, failure } = useRemoveFriend(friend.id);
  return (
    <FriendsPlayerRow player={friend} failure={failure}>
      <FriendActionKey labels={REMOVE_LABELS} label={label} disabled={disabled} onPress={remove} />
    </FriendsPlayerRow>
  );
}
