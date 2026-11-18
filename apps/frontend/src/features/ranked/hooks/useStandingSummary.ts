import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { standingQueryOptions } from "../api/standingQueryOptions.ts";
import { describeStanding } from "../standing/describeStanding.ts";

export function useStandingSummary(player: SignedInPlayer) {
  const { data, isPending, error } = useQuery(standingQueryOptions(player.id));
  return {
    summary: data === undefined ? null : describeStanding(data),
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
