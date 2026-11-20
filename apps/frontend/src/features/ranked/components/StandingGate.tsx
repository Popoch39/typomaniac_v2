import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useVoidedDuels } from "../../fair-play/hooks/useVoidedDuels.ts";
import type { VoidedDuel } from "../../fair-play/notice/describeVoidedDuel.ts";
import { useStanding } from "../hooks/useStanding.ts";
import type { OwnStanding } from "../standing/describeStanding.ts";

interface StandingGateProps {
  player: SignedInPlayer;
  children: (standing: OwnStanding, voidedDuels: readonly VoidedDuel[]) => ReactNode;
}

// Shows its content once the Player's Standing and their Voided Duels are both read, in parallel, so
// that the notice of a Voided Duel never pushes in above a page already drawn; says so while they are not.
export function StandingGate({ player, children }: StandingGateProps) {
  const standing = useStanding(player);
  const voided = useVoidedDuels(player);

  if (standing.isPending || voided.isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading your Standing…" />;
  }
  const failure = standing.failure ?? voided.failure;
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (standing.standing === null || voided.voidedDuels === null) return null;
  return children(standing.standing, voided.voidedDuels);
}
