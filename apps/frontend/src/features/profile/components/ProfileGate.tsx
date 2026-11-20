import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";
import { useProfileReads } from "../hooks/useProfileReads.ts";

interface ProfileGateProps {
  /** Null while the session is checked: the gate then only shows its pending view. */
  player: SignedInPlayer | null;
  /** Shown while the Profile is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (standing: OwnStanding, player: SignedInPlayer) => ReactNode;
}

// Holds the Profile back until every panel can be drawn whole, so that none is pushed in or grows later.
export function ProfileGate({ player, pending, children }: ProfileGateProps) {
  const { standing, stage, failure, retry } = useProfileReads(player);

  return (
    <ReadGate stage={stage} pending={pending} title="Profile" failure={failure} retry={retry}>
      {standing !== null && player !== null && children(standing, player)}
    </ReadGate>
  );
}
