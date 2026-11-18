import { useDuelRounds } from "../hooks/useDuelRounds.ts";
import { DuelNextRound } from "./DuelNextRound.tsx";
import { DuelRoundResults } from "./DuelRoundResults.tsx";

export function DuelRoundEnd() {
  const ended = useDuelRounds().at(-1);
  if (ended === undefined) return null;

  return (
    <>
      <DuelNextRound />
      <DuelRoundResults title={ended.title} sides={ended.sides} />
    </>
  );
}
