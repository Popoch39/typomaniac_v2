import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import {
  ACCEPT_LABELS,
  DECLINE_LABELS,
  useReceivedRequestActions,
} from "../hooks/useReceivedRequestActions.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendsPlayerRow } from "./FriendsPlayerRow.tsx";

interface ReceivedRequestRowProps {
  sender: ListedPlayer;
}

export function ReceivedRequestRow({ sender }: ReceivedRequestRowProps) {
  const { acceptLabel, declineLabel, disabled, accept, decline, failure } =
    useReceivedRequestActions(sender.id);
  return (
    <FriendsPlayerRow player={sender} failure={failure}>
      <FriendActionKey
        labels={ACCEPT_LABELS}
        label={acceptLabel}
        disabled={disabled}
        onPress={accept}
        variant="action"
      />
      <FriendActionKey
        labels={DECLINE_LABELS}
        label={declineLabel}
        disabled={disabled}
        onPress={decline}
      />
    </FriendsPlayerRow>
  );
}
