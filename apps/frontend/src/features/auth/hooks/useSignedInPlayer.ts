import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readGate, readStage } from "../../../shared/api/readStage.ts";
import { meQueryOptions } from "../api/meQueryOptions.ts";

export type SignedInPlayer = NonNullable<ReturnType<typeof useSignedInPlayer>["player"]>;

export function useSignedInPlayer() {
  const me = useQuery(meQueryOptions());
  const { data, isPending, error } = me;
  return {
    player: data ?? null,
    isPending,
    /** Ready with null for a Guest. */
    gate: readGate(
      readStage([me]),
      data,
      error === null ? null : describeApiError(error),
      () => void me.refetch(),
    ),
  };
}
