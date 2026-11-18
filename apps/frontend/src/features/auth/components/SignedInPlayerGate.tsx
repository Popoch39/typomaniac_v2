import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { type SignedInPlayer, useSignedInPlayer } from "../hooks/useSignedInPlayer.ts";
import "./SignedInPlayerGate.css";

interface SignedInPlayerGateProps {
  guest: ReactNode;
  children: (player: SignedInPlayer) => ReactNode;
}

/**
 * Shows its content to a signed-in Player only, and its guest content otherwise. The icons stay
 * hidden unless a compact layout swaps the message for them.
 */
export function SignedInPlayerGate({ guest, children }: SignedInPlayerGateProps) {
  const { player, isPending, failure } = useSignedInPlayer();

  if (isPending) {
    return (
      <p role="status" className="session-check" title="Checking your session…">
        <LoaderCircle className="session-check-icon" aria-hidden="true" size={20} />
        <span className="session-check-message">Checking your session…</span>
      </p>
    );
  }
  if (failure) {
    return (
      <p role="alert" className="session-check" title={failure}>
        <CircleAlert className="session-check-icon" aria-hidden="true" size={20} />
        <span className="session-check-message">{failure}</span>
      </p>
    );
  }
  if (player === null) return guest;
  return children(player);
}
