import { Panel } from "../../../shared/components/Panel.tsx";
import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { FriendsPlayerList } from "./FriendsPlayerList.tsx";
import { ReceivedRequestRow } from "./ReceivedRequestRow.tsx";
import { SentRequestRow } from "./SentRequestRow.tsx";

interface FriendRequestsPanelsProps {
  received: ListedPlayer[];
  sent: ListedPlayer[];
}

export function FriendRequestsPanels({ received, sent }: FriendRequestsPanelsProps) {
  return (
    <>
      <Panel title="Received requests" tag={String(received.length)}>
        <FriendsPlayerList empty="No Friend request waits for you." isEmpty={received.length === 0}>
          {received.map((sender) => (
            <ReceivedRequestRow key={sender.id} sender={sender} />
          ))}
        </FriendsPlayerList>
      </Panel>
      <Panel title="Sent requests" tag={String(sent.length)}>
        <FriendsPlayerList
          empty="None of your Friend requests is waiting."
          isEmpty={sent.length === 0}
        >
          {sent.map((receiver) => (
            <SentRequestRow key={receiver.id} receiver={receiver} />
          ))}
        </FriendsPlayerList>
      </Panel>
    </>
  );
}
