import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { fairPlayQueryOptions } from "../api/fairPlayQueryOptions.ts";

/** Waits without reading while `player` is null, the session not being known yet. */
export function useVoidedDuels(player: SignedInPlayer | null) {
  const read = useQuery(fairPlayQueryOptions(player === null ? null : player.id));
  const { data, error } = read;
  return {
    voidedDuels: data?.voidedDuels ?? null,
    suspension: data?.suspension ?? null,
    read,
    failure: error === null ? null : describeApiError(error),
  };
}
