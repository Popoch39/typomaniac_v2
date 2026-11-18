import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

const FAILURES: Record<number, string> = {
  403: "Choose a Nickname to create a Duel.",
};

async function createDuel() {
  const response = await fetch("/api/duels", { method: "POST" });
  if (!response.ok)
    throw new Error(FAILURES[response.status] ?? "The Duel could not be created. Try again.");
  return ((await response.json()) as { id: string }).id;
}

export function useCreateDuel() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useMutation({
    mutationFn: createDuel,
    onSuccess: (duelId) => navigate({ to: "/duel/$duelId", params: { duelId } }),
  });
  return { create: () => mutate(), isPending, failure: error?.message ?? null };
}
