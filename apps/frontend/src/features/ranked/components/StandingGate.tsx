import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { Suspension } from "../../fair-play/notice/describeSuspension.ts";
import type { VoidedDuel } from "../../fair-play/notice/describeVoidedDuel.ts";
import { useRankedReads } from "../hooks/useRankedReads.ts";
import type { OwnStanding } from "../standing/describeStanding.ts";

interface StandingGateProps {
  /** Null while the session is checked: the gate then only shows its pending view. */
  player: SignedInPlayer | null;
  /** Shown while the Standing is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (
    standing: OwnStanding,
    player: SignedInPlayer,
    voidedDuels: readonly VoidedDuel[],
    suspension: Suspension | null,
  ) => ReactNode;
}

// Shows its content once the Player's Standing and their fair-play state are both read, and a way to
// read them again when that fails.
export function StandingGate({ player, pending, children }: StandingGateProps) {
  const gate = useRankedReads(player);

  return (
    <ReadGate state={gate} pending={pending} title="Standing">
      {(ranked) => children(ranked.standing, ranked.player, ranked.voidedDuels, ranked.suspension)}
    </ReadGate>
  );
}
