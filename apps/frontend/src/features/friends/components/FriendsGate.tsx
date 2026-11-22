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
  const { friends, requests, stage, failure, retry } = useFriendsReads();
  return (
    <ReadGate stage={stage} pending={pending} title="Friends" failure={failure} retry={retry}>
      {friends !== undefined &&
        requests !== undefined &&
        children(friends, requests.received, requests.sent)}
    </ReadGate>
  );
}
