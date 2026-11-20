import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useStanding } from "../hooks/useStanding.ts";
import type { OwnStanding } from "../standing/describeStanding.ts";

interface StandingGateProps {
  /** Null while the session is checked: the gate then only shows its pending view. */
  player: SignedInPlayer | null;
  /** Shown while the Standing is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (standing: OwnStanding, player: SignedInPlayer) => ReactNode;
}

// Shows its content once the Player's Standing is read, and a way to read it again when that fails.
export function StandingGate({ player, pending, children }: StandingGateProps) {
  const { standing, stage, failure, retry } = useStanding(player);

  return (
    <ReadGate stage={stage} pending={pending} title="Standing" failure={failure} retry={retry}>
      {standing !== null && player !== null && children(standing, player)}
    </ReadGate>
  );
}
