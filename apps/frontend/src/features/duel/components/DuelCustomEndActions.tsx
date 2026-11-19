import { Link } from "@tanstack/react-router";
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
      {/* The line is kept even without a failure, so that one showing moves nothing. */}
      <p role="alert" className="m-0 min-h-lh text-danger">
        {failure}
      </p>
    </div>
  );
}
