import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import type { SignedInPlayer } from "../../auth/session/sessionOf.ts";
import { standingQueryOptions } from "../api/standingQueryOptions.ts";

/** Waits without reading while `player` is null, the session not being known yet. */
export function useStanding(player: SignedInPlayer | null) {
  const read = useQuery(standingQueryOptions(player === null ? null : player.id));
  const { data, error } = read;
  return {
    standing: data ?? null,
    read,
    stage: readStage([read]),
    failure: error === null ? null : describeApiError(error),
    retry: () => void read.refetch(),
  };
}
