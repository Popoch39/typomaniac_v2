import type { RoundListEntry } from "../round/roundList.ts";
import { DuelCaption } from "./DuelCaption.tsx";
import { DuelRoundPip } from "./DuelRoundPip.tsx";

interface DuelRoundListProps {
  rounds: readonly RoundListEntry[];
}

export function DuelRoundList({ rounds }: DuelRoundListProps) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <DuelCaption className="pb-1.5">Rounds</DuelCaption>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {rounds.map(({ number, state, label, points }) => (
          <li key={number} className="flex items-center gap-3.5 py-1.5">
            <span className="w-[70px] text-sm text-ink-subtle">Round {number}</span>
            <DuelRoundPip state={state} />
            <span className="sr-only">{label}, </span>
            <span className="font-mono text-[15px] font-bold text-ink tabular-nums">
              {points}
              <span className="sr-only"> Points</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
