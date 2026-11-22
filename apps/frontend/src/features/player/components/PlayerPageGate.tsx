import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { AddFriendTarget } from "../../friends/relation/addFriendTarget.ts";
import {
  type Progress,
  type PublicPlayer,
  usePlayerPageReads,
} from "../hooks/usePlayerPageReads.ts";

interface PlayerPageGateProps {
  nickname: string;
  /** Shown while the page is read, and again while a failed read is tried again. */
  pending: ReactNode;
  /** `isProgressUpdating` while the Progress shown is that of the previous period or kind. */
  children: (
    player: PublicPlayer,
    progress: Progress,
    isProgressUpdating: boolean,
    addFriend: AddFriendTarget,
  ) => ReactNode;
}

// Holds the page back until every panel can be drawn whole, so that none is pushed in or grows later.
export function PlayerPageGate({ nickname, pending, children }: PlayerPageGateProps) {
  const { player, progress, isProgressUpdating, addFriend, stage, failure, retry } =
    usePlayerPageReads(nickname);

  return (
    <ReadGate stage={stage} pending={pending} title="Player" failure={failure} retry={retry}>
      {player !== null &&
        progress !== null &&
        children(player, progress, isProgressUpdating, addFriend)}
    </ReadGate>
  );
}
