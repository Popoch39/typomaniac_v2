import { Link } from "@tanstack/react-router";
import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useCreateDuel } from "../hooks/useCreateDuel.ts";
import { DuelEndKeys } from "./DuelEndKeys.tsx";

export function DuelCustomEndActions() {
  const { create, isPending, failure } = useCreateDuel();

  return (
    <div className="flex flex-col items-center gap-3">
      <DuelEndKeys>
        <Keycap type="button" variant="brand" size="xl" onClick={create} disabled={isPending}>
          {isPending ? "Creating…" : "New Custom Duel"}
        </Keycap>
        <Keycap asChild variant="neutral" size="lg">
          <Link to="/">Back home</Link>
        </Keycap>
      </DuelEndKeys>
      <DangerStatusLine message={failure} />
    </div>
  );
}
