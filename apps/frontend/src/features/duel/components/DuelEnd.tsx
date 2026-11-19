import { useDuelEnd } from "../hooks/useDuelEnd.ts";
import { useDuelRounds } from "../hooks/useDuelRounds.ts";
import { DuelBackToRanked } from "./DuelBackToRanked.tsx";
import { DuelRankedEnd } from "./DuelRankedEnd.tsx";
import { DuelRoundResults } from "./DuelRoundResults.tsx";

export function DuelEnd() {
  const end = useDuelEnd();
  const rounds = useDuelRounds();
  if (end === null) return null;

  return (
    <section className="flex flex-col gap-8">
      <h1>{end.outcome}</h1>
      <DuelRankedEnd />
      <DuelBackToRanked />
      {rounds.map(({ number, title, sides }) => (
        <DuelRoundResults key={number} title={title} sides={sides} />
      ))}
    </section>
  );
}
