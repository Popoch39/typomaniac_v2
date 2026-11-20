import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import { meQueryOptions } from "../api/meQueryOptions.ts";

export type SignedInPlayer = NonNullable<ReturnType<typeof useSignedInPlayer>["player"]>;

export function useSignedInPlayer() {
  const me = useQuery(meQueryOptions());
  const { data, isPending, error } = me;
  return {
    player: data ?? null,
    isPending,
    stage: readStage([me]),
    failure: error === null ? null : describeApiError(error),
    retry: () => void me.refetch(),
  };
}
