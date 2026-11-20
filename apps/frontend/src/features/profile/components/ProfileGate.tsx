import type { ReactNode } from "react";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";
import { useProfileReads } from "../hooks/useProfileReads.ts";

interface ProfileGateProps {
  /** Null while the session is checked: the gate then only shows its pending view. */
  player: SignedInPlayer | null;
  /** Shown while the Profile is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (standing: OwnStanding) => ReactNode;
}

// Holds the Profile back until every panel can be drawn whole, so that none is pushed in or grows later.
export function ProfileGate({ player, pending, children }: ProfileGateProps) {
  const { standing, stage, failure, retry } = useProfileReads(player);

  if (stage === "loading") return pending;
  if (stage === "failed" && failure !== null) {
    return (
      <ErrorPanel title="Profile" message={failure}>
        <TryAgainKey onRetry={retry} />
      </ErrorPanel>
    );
  }
  if (standing === null) return null;
  return children(standing);
}
