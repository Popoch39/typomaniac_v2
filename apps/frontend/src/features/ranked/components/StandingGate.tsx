import type { ReactNode } from "react";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useStanding } from "../hooks/useStanding.ts";
import type { OwnStanding } from "../standing/describeStanding.ts";

interface StandingGateProps {
  player: SignedInPlayer;
  /** Shown while the Standing is read, and again while a failed read is tried again. */
  pending: ReactNode;
  children: (standing: OwnStanding) => ReactNode;
}

// Shows its content once the Player's Standing is read, and a way to read it again when that fails.
export function StandingGate({ player, pending, children }: StandingGateProps) {
  const { standing, stage, failure, retry } = useStanding(player);

  if (stage === "loading") return pending;
  if (stage === "failed" && failure !== null) {
    return (
      <ErrorPanel title="Standing" message={failure}>
        <TryAgainKey onRetry={retry} />
      </ErrorPanel>
    );
  }
  if (standing === null) return null;
  return children(standing);
}
