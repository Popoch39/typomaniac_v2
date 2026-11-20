import type { ReactNode } from "react";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import { type SignedInPlayer, useSignedInPlayer } from "../hooks/useSignedInPlayer.ts";

interface SignedInPlayerGateProps {
  /** Shown while the session is checked, and again while a failed check is tried again. */
  pending: ReactNode;
  guest: ReactNode;
  /** What a failed check shows; an ErrorPanel with "Try again" when not given. */
  failed?: (failure: string, retry: () => void) => ReactNode;
  children: (player: SignedInPlayer) => ReactNode;
}

// Shows its content to a signed-in Player only, and its guest content otherwise. The pending view
// comes from the caller, so that a page can hand the same skeleton to the gates chained after it.
export function SignedInPlayerGate({ pending, guest, failed, children }: SignedInPlayerGateProps) {
  const { player, stage, failure, retry } = useSignedInPlayer();

  if (stage === "loading") return pending;
  if (stage === "failed" && failure !== null) {
    if (failed !== undefined) return failed(failure, retry);
    return (
      <ErrorPanel title="Session" message={failure}>
        <TryAgainKey onRetry={retry} />
      </ErrorPanel>
    );
  }
  if (player === null) return guest;
  return children(player);
}
