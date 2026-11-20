import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import type { ReviewEnding } from "../review/reviewEnding.ts";
import { settledLine } from "../review/settledLine.ts";
import { settlementOf } from "../review/settlementOf.ts";
import { voidableDuels } from "../review/voidableDuels.ts";
import type { Review } from "./useReview.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

const FAILURES = {
  ...ADMINISTRATION_WORDING,
  REVIEW_ALREADY_SETTLED: "This Review is settled already.",
  DUEL_NOT_FOUND: "One of the chosen Duels is not a ranked Duel of this Player.",
};

async function settle({
  reviewId,
  settlement,
}: {
  reviewId: string;
  settlement: NonNullable<ReturnType<typeof settlementOf>>;
}) {
  const { error } = await apiClient.api.admin.reviews({ id: reviewId }).settlement.post(settlement);
  if (error) throw error;
}

/** The four endings of a Review, the won Duels to choose from for voiding, and how it was settled. */
export function useSettleReview({ id, duels }: Review) {
  const [chosenDuelIds, setChosenDuelIds] = useState<readonly string[]>([]);
  const { mutate, isPending, isSuccess, variables, error } = useMutation({
    mutationFn: settle,
    // A settled Review leaves the queue, and its Sanctions list gains what was decided.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
  const endWith = (ending: ReviewEnding) => {
    const settlement = settlementOf(ending, chosenDuelIds);
    if (settlement !== null) mutate({ reviewId: id, settlement });
  };
  return {
    voidable: voidableDuels(duels),
    chosenDuelIds,
    toggleDuel: (duelId: string) =>
      setChosenDuelIds((chosen) =>
        chosen.includes(duelId) ? chosen.filter((c) => c !== duelId) : [...chosen, duelId],
      ),
    isPending,
    // Once settled, nothing is left to choose: the endings stay in place, disabled.
    isLocked: isPending || isSuccess,
    canVoid: settlementOf("voided_duels", chosenDuelIds) !== null,
    endWith,
    settled: isSuccess && variables ? settledLine(variables.settlement.decision) : null,
    failure: error === null ? null : describeApiError(error, FAILURES),
  };
}
