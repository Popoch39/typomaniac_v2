import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { meQueryOptions } from "../api/meQueryOptions.ts";

export type SignedInPlayer = NonNullable<ReturnType<typeof useSignedInPlayer>["player"]>;

export function useSignedInPlayer() {
  const { data, isPending, error } = useQuery(meQueryOptions());
  return {
    player: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
