import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";
import { ornamentQueryOptions } from "../api/ornamentQueryOptions.ts";
import { ornamentOptions } from "../picker/ornamentOptions.ts";
import { useChooseOrnament } from "./useChooseOrnament.ts";

export function useOrnamentPicker(player: SignedInPlayer) {
  const read = useQuery(ornamentQueryOptions(player.id));
  const {
    standing,
    read: standingRead,
    failure: standingFailure,
    retry: retryStanding,
  } = useStanding(player);
  const { choose, isPending: isSaving, failure: saveFailure } = useChooseOrnament(player.id);
  const { data, error } = read;

  return {
    stage: readStage([read, standingRead]),
    readFailure: error === null ? standingFailure : describeApiError(error),
    retry: () => {
      if (read.isError) void read.refetch();
      if (standingRead.isError) retryStanding();
    },
    chosen: data?.choice ?? null,
    options: data === undefined ? [] : ornamentOptions(data.peakTier, standing?.rank ?? null),
    choose,
    isSaving,
    saveFailure,
  };
}
