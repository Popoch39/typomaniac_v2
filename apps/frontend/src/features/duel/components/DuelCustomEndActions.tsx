import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useCreateDuel } from "../hooks/useCreateDuel.ts";

export function DuelCustomEndActions() {
  const { create, isPending, failure } = useCreateDuel();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Room under the keys for their edge. */}
      <div className="flex items-center justify-center gap-5 pt-2 pb-[9px]">
        <Keycap type="button" variant="brand" size="xl" onClick={create} disabled={isPending}>
          {isPending ? "Creating…" : "New Custom Duel"}
        </Keycap>
        <Keycap asChild variant="neutral" size="lg">
          <Link to="/">Back home</Link>
        </Keycap>
      </div>
      {/* The line is kept even without a failure, so that one showing moves nothing. */}
      <p role="alert" className="m-0 min-h-lh text-danger">
        {failure}
      </p>
    </div>
  );
}
