import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import type { ChainedSession } from "../../auth/session/sessionOf.ts";
import { type Profile, useProfileReads } from "../hooks/useProfileReads.ts";

interface ProfileGateProps {
  /** While it is checked, the gate only shows its pending view. */
  session: ChainedSession;
  /** Shown while the Profile is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (profile: Profile) => ReactNode;
}

// Holds the Profile back until every panel can be drawn whole, so that none is pushed in or grows later.
export function ProfileGate({ session, pending, children }: ProfileGateProps) {
  const gate = useProfileReads(session);

  return (
    <ReadGate state={gate} pending={pending} title="Profile">
      {children}
    </ReadGate>
  );
}
