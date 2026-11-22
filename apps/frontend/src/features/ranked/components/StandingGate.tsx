import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { ChainedSession, SignedInSession } from "../../auth/session/sessionOf.ts";
import type { Suspension } from "../../fair-play/notice/describeSuspension.ts";
import type { VoidedDuel } from "../../fair-play/notice/describeVoidedDuel.ts";
import { useRankedReads } from "../hooks/useRankedReads.ts";
import type { OwnStanding } from "../standing/describeStanding.ts";

interface StandingGateProps {
  /** While it is checked, the gate only shows its pending view. */
  session: ChainedSession;
  /** Shown while the Standing is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (
    standing: OwnStanding,
    session: SignedInSession,
    voidedDuels: readonly VoidedDuel[],
    suspension: Suspension | null,
  ) => ReactNode;
}

// Shows its content once the Player's Standing and their fair-play state are both read, and a way to
// read them again when that fails.
export function StandingGate({ session, pending, children }: StandingGateProps) {
  const gate = useRankedReads(session);

  return (
    <ReadGate state={gate} pending={pending} title="Standing">
      {(ranked) => children(ranked.standing, ranked.session, ranked.voidedDuels, ranked.suspension)}
    </ReadGate>
  );
}
