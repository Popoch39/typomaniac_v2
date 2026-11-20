import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { standingQueryOptions } from "../api/standingQueryOptions.ts";

export function useStanding(player: SignedInPlayer) {
  const read = useQuery(standingQueryOptions(player.id));
  const { data, isPending, error } = read;
  return {
    standing: data ?? null,
    isPending,
    stage: readStage([read]),
    failure: error === null ? null : describeApiError(error),
    retry: () => void read.refetch(),
  };
}
