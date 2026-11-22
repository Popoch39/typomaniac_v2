import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { CANCEL_LABELS, useCancelRequest } from "../hooks/useCancelRequest.ts";
import { FriendActionKey } from "./FriendActionKey.tsx";
import { FriendsPlayerRow } from "./FriendsPlayerRow.tsx";

interface SentRequestRowProps {
  receiver: ListedPlayer;
}

export function SentRequestRow({ receiver }: SentRequestRowProps) {
  const { label, disabled, cancel, failure } = useCancelRequest(receiver.id);
  return (
    <FriendsPlayerRow player={receiver} failure={failure}>
      <FriendActionKey labels={CANCEL_LABELS} label={label} disabled={disabled} onPress={cancel} />
    </FriendsPlayerRow>
  );
}
