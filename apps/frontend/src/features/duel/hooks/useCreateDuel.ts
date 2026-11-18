import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { describeApiError } from "../../../shared/api/describeApiError.ts";

const FAILURES = { NICKNAME_REQUIRED: "Choose a Nickname to create a Duel." };

async function createDuel() {
  const { data, error } = await apiClient.api.duels.post();
  if (error) throw error;
  return data.id;
}

export function useCreateDuel() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useMutation({
    mutationFn: createDuel,
    onSuccess: (duelId) => navigate({ to: "/duel/$duelId", params: { duelId } }),
  });
  return {
    create: () => mutate(),
    isPending,
    failure: error === null ? null : describeApiError(error, FAILURES),
  };
}
