import { Button } from "../../../shared/components/ui/button.tsx";
import { useCreateDuel } from "../hooks/useCreateDuel.ts";

export function CreateDuelButton() {
  const { create, isPending, failure } = useCreateDuel();

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={create} disabled={isPending}>
        {isPending ? "Creating…" : "Create a Duel"}
      </Button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
