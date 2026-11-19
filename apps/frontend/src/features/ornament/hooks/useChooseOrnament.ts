import type { OrnamentChoice } from "@repo/ranked-engine";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { leaderboardQueryKey } from "../../leaderboard/api/leaderboardQueryOptions.ts";
import { ornamentQueryOptions } from "../api/ornamentQueryOptions.ts";

const FAILURES = {
  ORNAMENT_LOCKED: "This Ornament is still locked: reach its Tier first.",
  ORNAMENT_INVALID: "This Ornament does not exist.",
};

async function chooseOrnament(choice: OrnamentChoice) {
  const { data, error } = await apiClient.api.me.ornament.put({ choice });
  if (error) throw error;
  return data;
}

export function useChooseOrnament(playerId: string) {
  const { mutate, isPending, error } = useMutation({
    mutationFn: chooseOrnament,
    onSuccess: (ornament) => {
      queryClient.setQueryData(ornamentQueryOptions(playerId).queryKey, ornament);
      // The worn Ornament shows in the sidebar and on the Leaderboard too.
      void queryClient.invalidateQueries({ queryKey: meQueryOptions().queryKey });
      void queryClient.invalidateQueries({ queryKey: leaderboardQueryKey });
    },
  });
  return {
    choose: (choice: OrnamentChoice) => mutate(choice),
    isPending,
    failure: error === null ? null : describeApiError(error, FAILURES),
  };
}
