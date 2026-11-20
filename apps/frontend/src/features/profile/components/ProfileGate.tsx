import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";
import { type ProfileProgress, useProfileReads } from "../hooks/useProfileReads.ts";

interface ProfileGateProps {
  /** Null while the session is checked: the gate then only shows its pending view. */
  player: SignedInPlayer | null;
  /** Shown while the Profile is read, and again while a failed read is tried again. */
  pending: ReactNode;
  /**
   * `progress` is null for a Player without a Nickname, whose Progress is not read;
   * `isProgressUpdating` while it is that of the previous period or kind.
   */
  children: (
    standing: OwnStanding,
    player: SignedInPlayer,
    progress: ProfileProgress | null,
    isProgressUpdating: boolean,
  ) => ReactNode;
}

// Holds the Profile back until every panel can be drawn whole, so that none is pushed in or grows later.
export function ProfileGate({ player, pending, children }: ProfileGateProps) {
  const { standing, progress, isProgressUpdating, stage, failure, retry } = useProfileReads(player);

  return (
    <ReadGate stage={stage} pending={pending} title="Profile" failure={failure} retry={retry}>
      {standing !== null &&
        player !== null &&
        children(standing, player, progress, isProgressUpdating)}
    </ReadGate>
  );
}
