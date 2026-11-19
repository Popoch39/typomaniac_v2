import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { standingQueryOptions } from "../api/standingQueryOptions.ts";

export function useStanding(player: SignedInPlayer) {
  const { data, isPending, error } = useQuery(standingQueryOptions(player.id));
  return {
    standing: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
