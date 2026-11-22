import { AddFriendSlot } from "../../friends/components/AddFriendSlot.tsx";
import { useDuelAddFriend } from "../hooks/useDuelAddFriend.ts";

export function DuelAddFriend() {
  const { target, reserve } = useDuelAddFriend();

  return <AddFriendSlot target={target} size="lg" reserve={reserve} />;
}
