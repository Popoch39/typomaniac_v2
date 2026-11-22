import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { useFriendState } from "../hooks/useFriendState.ts";
import { REMOVE_LABELS, useRemoveFriend } from "../hooks/useRemoveFriend.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendStateTag } from "./FriendStateTag.tsx";
import { FriendsPlayerRow } from "./FriendsPlayerRow.tsx";

interface FriendRowProps {
  friend: ListedPlayer;
}

export function FriendRow({ friend }: FriendRowProps) {
  const { label, disabled, remove, failure } = useRemoveFriend(friend.id);
  const state = useFriendState(friend.id);
  return (
    <FriendsPlayerRow
      player={friend}
      failure={failure}
      detail={<FriendStateTag state={state.state} label={state.label} />}
    >
      <FriendActionKey labels={REMOVE_LABELS} label={label} disabled={disabled} onPress={remove} />
    </FriendsPlayerRow>
  );
}
