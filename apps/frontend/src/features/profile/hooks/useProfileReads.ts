import { useQuery } from "@tanstack/react-query";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { ornamentQueryOptions } from "../../ornament/api/ornamentQueryOptions.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";

/**
 * The reads the Profile lays out, sent together so that the page is drawn once they are all back. The
 * Ornament is only read with a Nickname, which its route requires; its failure is the picker's to say.
 */
export function useProfileReads(player: SignedInPlayer) {
  const { standing, isPending, failure } = useStanding(player);
  const hasNickname = player.nickname !== null;
  const ornament = useQuery({ ...ornamentQueryOptions(player.id), enabled: hasNickname });

  return { standing, isPending: isPending || (hasNickname && ornament.isPending), failure };
}
