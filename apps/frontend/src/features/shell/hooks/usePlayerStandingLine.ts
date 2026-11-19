import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";
import { standingLine } from "../../ranked/standing/standingLine.ts";

export function usePlayerStandingLine(player: SignedInPlayer) {
  const { standing } = useStanding(player);
  return standing === null ? null : standingLine(standing);
}
