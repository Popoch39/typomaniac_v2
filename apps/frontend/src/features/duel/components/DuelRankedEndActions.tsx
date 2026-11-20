import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { FindDuelIcon } from "../../../shared/components/FindDuelIcon.tsx";
import { useFindNextDuel } from "../hooks/useFindNextDuel.ts";
import { DuelEndKeys } from "./DuelEndKeys.tsx";
import { DuelReportOpponent } from "./DuelReportOpponent.tsx";

export function DuelRankedEndActions() {
  const findNextDuel = useFindNextDuel();

  return (
    <DuelEndKeys>
      <Keycap type="button" variant="brand" size="xl" onClick={findNextDuel}>
        <FindDuelIcon />
        Find a Duel
      </Keycap>
      <Keycap asChild variant="neutral" size="lg">
        <Link to="/ranked">Back to Ranked</Link>
      </Keycap>
      <DuelReportOpponent />
    </DuelEndKeys>
  );
}
