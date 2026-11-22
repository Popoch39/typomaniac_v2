import { CHALLENGE_LABELS, useChallengeKey } from "../../challenge/hooks/useChallengeKey.ts";
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
  const challengeKey = useChallengeKey(friend, state.state);
  return (
    <FriendsPlayerRow
      player={friend}
      failure={failure}
      detail={<FriendStateTag state={state.state} label={state.label} />}
    >
      <FriendActionKey
        labels={CHALLENGE_LABELS}
        label={challengeKey.label}
        variant="action"
        disabled={challengeKey.disabled}
        onPress={challengeKey.challenge}
      />
      <FriendActionKey labels={REMOVE_LABELS} label={label} disabled={disabled} onPress={remove} />
    </FriendsPlayerRow>
  );
}
