import { useDuelEndActions } from "../hooks/useDuelEndActions.ts";
import { DuelCustomEndActions } from "./DuelCustomEndActions.tsx";
import { DuelRankedEndActions } from "./DuelRankedEndActions.tsx";

export function DuelEndActions() {
  const { isRanked, isEnded } = useDuelEndActions();

  return (
    // Kept in place but out of reach after the last Round, until the server ends the Duel, so that
    // nothing moves when they show.
    <div inert={!isEnded} className={isEnded ? undefined : "invisible"}>
      {isRanked ? <DuelRankedEndActions /> : <DuelCustomEndActions />}
    </div>
  );
}
