import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import { useFriendsReads } from "../hooks/useFriendsReads.ts";
import type { ListedPlayer } from "../api/friendsQueryOptions.ts";

interface FriendsGateProps {
  /** Shown while the Friends and requests are read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (friends: ListedPlayer[], received: ListedPlayer[], sent: ListedPlayer[]) => ReactNode;
}

// Holds the page back until its Friends and requests are both read, so that no panel is pushed in later.
export function FriendsGate({ pending, children }: FriendsGateProps) {
  const gate = useFriendsReads();
  return (
    <ReadGate state={gate} pending={pending} title="Friends">
      {({ friends, requests }) => children(friends, requests.received, requests.sent)}
    </ReadGate>
  );
}
