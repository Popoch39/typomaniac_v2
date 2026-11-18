import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useStandingSummary } from "../hooks/useStandingSummary.ts";
import type { StandingSummary } from "../standing/describeStanding.ts";

interface StandingGateProps {
  player: SignedInPlayer;
  children: (summary: StandingSummary) => ReactNode;
}

// Shows its content once the Player's Standing is read, and says so while it is not.
export function StandingGate({ player, children }: StandingGateProps) {
  const { summary, isPending, failure } = useStandingSummary(player);

  if (isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading your Standing…" />;
  }
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (summary === null) return null;
  return children(summary);
}
