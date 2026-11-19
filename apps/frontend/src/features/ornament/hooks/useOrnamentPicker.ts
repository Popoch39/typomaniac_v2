import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";
import { ornamentQueryOptions } from "../api/ornamentQueryOptions.ts";
import { ornamentOptions } from "../picker/ornamentOptions.ts";
import { useChooseOrnament } from "./useChooseOrnament.ts";

export function useOrnamentPicker(player: SignedInPlayer) {
  const { data, isPending, error } = useQuery(ornamentQueryOptions(player.id));
  const { standing, isPending: isStandingPending, failure: standingFailure } = useStanding(player);
  const { choose, isPending: isSaving, failure: saveFailure } = useChooseOrnament(player.id);
  const readFailure = error === null ? standingFailure : describeApiError(error);

  return {
    isPending: isPending || isStandingPending,
    readFailure,
    chosen: data?.choice ?? null,
    options: data === undefined ? [] : ornamentOptions(data.peakTier, standing?.rank ?? null),
    choose,
    isSaving,
    saveFailure,
  };
}
