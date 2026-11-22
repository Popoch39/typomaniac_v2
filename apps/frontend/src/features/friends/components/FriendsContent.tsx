import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { FriendListPanel } from "./FriendListPanel.tsx";
import { FriendRequestsPanels } from "./FriendRequestsPanels.tsx";
import { FriendSearchPanel } from "./FriendSearchPanel.tsx";

interface FriendsContentProps {
  friends: ListedPlayer[];
  received: ListedPlayer[];
  sent: ListedPlayer[];
}

// The search sits in a column of its own, last on a narrow screen, so that its results, which grow
// as the Player types, never push a panel down.
export function FriendsContent({ friends, received, sent }: FriendsContentProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-7 pb-2.5">
      <div className="flex flex-col gap-7">
        <FriendRequestsPanels received={received} sent={sent} />
        <FriendListPanel friends={friends} />
      </div>
      <FriendSearchPanel />
    </div>
  );
}
