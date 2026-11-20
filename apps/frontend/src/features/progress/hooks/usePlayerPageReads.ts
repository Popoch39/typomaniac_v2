import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { publicPlayerQueryOptions } from "../api/publicPlayerQueryOptions.ts";

export type PublicPlayer = NonNullable<ReturnType<typeof usePlayerPageReads>["player"]>;

/** The reads a Player's public page lays out, so that the page is drawn once they are all back. */
export function usePlayerPageReads(nickname: string) {
  const { data, isPending, error } = useQuery(publicPlayerQueryOptions(nickname));
  return {
    player: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
