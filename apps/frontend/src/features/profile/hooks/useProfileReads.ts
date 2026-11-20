import { useQuery } from "@tanstack/react-query";
import { loadingOnly, readStage } from "../../../shared/api/readStage.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { ornamentQueryOptions } from "../../ornament/api/ornamentQueryOptions.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";

/**
 * The reads the Profile lays out, sent together so that the page is drawn once they are all back, and
 * tried again together. Waits without reading while `player` is null, the session not being known yet.
 * The Ornament is only read with a Nickname, which its route requires; its failure is the picker's to say.
 */
export function useProfileReads(player: SignedInPlayer | null) {
  const { standing, read, failure, retry } = useStanding(player);
  const hasNickname = player !== null && player.nickname !== null;
  const ornament = useQuery({ ...ornamentQueryOptions(player?.id ?? ""), enabled: hasNickname });

  return {
    standing,
    stage: readStage(hasNickname ? [read, loadingOnly(ornament)] : [read]),
    failure,
    retry: () => {
      retry();
      if (hasNickname) void ornament.refetch();
    },
  };
}
