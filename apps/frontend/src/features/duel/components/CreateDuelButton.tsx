import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useCreateDuel } from "../hooks/useCreateDuel.ts";

export function CreateDuelButton() {
  const { create, isPending, failure } = useCreateDuel();

  return (
    <div className="flex flex-col items-start gap-3 pb-2">
      <Keycap type="button" variant="brand" size="lg" onClick={create} disabled={isPending}>
        {isPending ? "Creating…" : "Create a Duel"}
      </Keycap>
      <DangerStatusLine message={failure} />
    </div>
  );
}
