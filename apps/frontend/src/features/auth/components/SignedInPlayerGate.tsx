import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { type SignedInPlayer, useSignedInPlayer } from "../hooks/useSignedInPlayer.ts";

interface SignedInPlayerGateProps {
  guest: ReactNode;
  children: (player: SignedInPlayer) => ReactNode;
}

// Shows its content to a signed-in Player only, and its guest content otherwise.
export function SignedInPlayerGate({ guest, children }: SignedInPlayerGateProps) {
  const { player, isPending, failure } = useSignedInPlayer();

  if (isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Checking your session…" />;
  }
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (player === null) return guest;
  return children(player);
}
