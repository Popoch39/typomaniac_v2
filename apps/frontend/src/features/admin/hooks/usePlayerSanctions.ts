import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { playerSanctionsQueryOptions } from "../api/playerSanctionsQueryOptions.ts";
import { sanctionLine } from "../review/sanctionLine.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";
import type { Review } from "./useReview.ts";

const FAILURES = {
  ...ADMINISTRATION_WORDING,
  PLAYER_NOT_FOUND: "This Player does not exist any more.",
  SANCTION_NOT_FOUND: "This Sanction does not exist.",
  SANCTION_ALREADY_REVOKED: "This Sanction is revoked already.",
};

async function revoke(sanctionId: string) {
  const { error } = await apiClient.api.admin.sanctions({ id: sanctionId }).revocation.post();
  if (error) throw error;
}

/**
 * The reviewed Player's Sanctions, each on one line with whether it may still be revoked, and the
 * revocation after an appeal. The Review's own list shows until the fresh one comes back, so that
 * nothing moves.
 */
export function usePlayerSanctions({ player, sanctions: reviewed }: Review) {
  const { data, error: readError } = useQuery({
    ...playerSanctionsQueryOptions(player.id),
    initialData: reviewed,
  });
  const { mutate, isPending, variables, error } = useMutation({
    mutationFn: revoke,
    // A revocation moves Standings and may lift a Ban: the Review shows both.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
  const failure = error ?? readError;
  return {
    sanctions: data.map((sanction) => ({
      id: sanction.id,
      line: sanctionLine(sanction),
      revocable: sanction.revokedAt === null,
      isRevoking: isPending && variables === sanction.id,
    })),
    isPending,
    revoke: (sanctionId: string) => mutate(sanctionId),
    failure: failure === null ? null : describeApiError(failure, FAILURES),
  };
}
