import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { reportAction } from "../report/reportAction.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

async function reportOpponent(duelId: string) {
  const { error } = await apiClient.api.duels({ id: duelId }).report.post();
  if (error) throw error;
}

/** Reports the Opponent of the ranked Duel just ended, once: the action then confirms it was received. */
export function useReportOpponent() {
  const duelId = useDuelStore((state) => state.duelId);
  const { mutate, isPending, isSuccess, error } = useMutation({ mutationFn: reportOpponent });
  const action = reportAction({ isPending, isSuccess, error });
  return {
    ...action,
    disabled: isPending || action.made,
    report: () => {
      if (duelId !== null) mutate(duelId);
    },
  };
}
