import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";
import { type ProfileProgress, useProfileReads } from "../hooks/useProfileReads.ts";

interface ProfileGateProps {
  player: SignedInPlayer;
  /**
   * `progress` is null for a Player without a Nickname, whose Progress is not read;
   * `isProgressUpdating` while it is that of the previous period or kind.
   */
  children: (
    standing: OwnStanding,
    progress: ProfileProgress | null,
    isProgressUpdating: boolean,
  ) => ReactNode;
}

// Holds the Profile back until every panel can be drawn whole, so that none is pushed in or grows later.
export function ProfileGate({ player, children }: ProfileGateProps) {
  const { standing, progress, isProgressUpdating, isPending, failure } = useProfileReads(player);

  if (isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading your Profile…" />;
  }
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (standing === null) return null;
  return children(standing, progress, isProgressUpdating);
}
