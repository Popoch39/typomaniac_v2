import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { fairPlayQueryOptions } from "../api/fairPlayQueryOptions.ts";

export function useVoidedDuels(player: SignedInPlayer) {
  const { data, isPending, error } = useQuery(fairPlayQueryOptions(player.id));
  return {
    voidedDuels: data?.voidedDuels ?? null,
    suspension: data?.suspension ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
