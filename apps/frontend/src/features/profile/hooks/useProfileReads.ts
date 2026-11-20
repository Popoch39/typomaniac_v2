import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { ornamentQueryOptions } from "../../ornament/api/ornamentQueryOptions.ts";
import { progressQueryOptions } from "../../progress/api/progressQueryOptions.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";

/**
 * The reads the Profile lays out, sent together so that the page is drawn once they are all back. The
 * Ornament and the Progress are only read with a Nickname: the Ornament's route requires one and the
 * Progress is found by it. The Ornament's failure is the picker's to say.
 */
export function useProfileReads(player: SignedInPlayer) {
  const { standing, isPending, failure } = useStanding(player);
  const hasNickname = player.nickname !== null;
  const ornament = useQuery({ ...ornamentQueryOptions(player.id), enabled: hasNickname });
  const progress = useQuery({
    ...progressQueryOptions(player.nickname ?? ""),
    enabled: hasNickname,
  });

  return {
    standing,
    progress: progress.data ?? null,
    isPending: isPending || (hasNickname && (ornament.isPending || progress.isPending)),
    failure: failure ?? (progress.error === null ? null : describeApiError(progress.error)),
  };
}
