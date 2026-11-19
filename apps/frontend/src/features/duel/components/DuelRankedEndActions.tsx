import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { FindDuelIcon } from "../../queue/components/FindDuelIcon.tsx";
import { useFindNextDuel } from "../hooks/useFindNextDuel.ts";

export function DuelRankedEndActions() {
  const findNextDuel = useFindNextDuel();

  return (
    // Room under the keys for their edge.
    <div className="flex items-center justify-center gap-5 pt-2 pb-[9px]">
      <Keycap type="button" variant="brand" size="xl" onClick={findNextDuel}>
        <FindDuelIcon />
        Find a Duel
      </Keycap>
      <Keycap asChild variant="neutral" size="lg">
        <Link to="/ranked">Back to Ranked</Link>
      </Keycap>
    </div>
  );
}
