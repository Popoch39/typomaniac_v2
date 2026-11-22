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
  const gate = useProfileReads(player);

  return (
    <ReadGate state={gate} pending={pending} title="Profile">
      {(profile) =>
        children(profile.standing, profile.player, profile.progress, profile.isProgressUpdating)
      }
    </ReadGate>
  );
}
