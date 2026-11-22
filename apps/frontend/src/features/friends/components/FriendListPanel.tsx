import { Panel } from "../../../shared/components/Panel.tsx";
import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { FriendRow } from "./FriendRow.tsx";
import { FriendsPlayerList } from "./FriendsPlayerList.tsx";

interface FriendListPanelProps {
  friends: ListedPlayer[];
}

export function FriendListPanel({ friends }: FriendListPanelProps) {
  return (
    <Panel title="Friends" tag={String(friends.length)}>
      <FriendsPlayerList
        empty="No Friends yet. Find a Player by their Nickname to send them a Friend request."
        isEmpty={friends.length === 0}
      >
        {friends.map((friend) => (
          <FriendRow key={friend.id} friend={friend} />
        ))}
      </FriendsPlayerList>
    </Panel>
  );
}
