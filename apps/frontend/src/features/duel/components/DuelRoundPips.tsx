import { useDuelRoundPips } from "../hooks/useDuelRoundPips.ts";
import { DuelRoundPip } from "./DuelRoundPip.tsx";

export function DuelRoundPips() {
  const roundPips = useDuelRoundPips();
  if (roundPips === null) return null;

  return (
    <div className="flex items-center gap-2">
      {/* A fixed width, so the pips stay put when "Round 2" becomes "Duel over". */}
      <span className="mr-1 w-24 text-right font-mono text-xs font-bold tracking-[.16em] text-ink-subtle uppercase">
        {roundPips.caption}
      </span>
      <ol aria-label="Rounds" className="m-0 flex list-none gap-2 p-0">
        {roundPips.pips.map(({ number, state, label }) => (
          <li key={number} className="flex">
            <DuelRoundPip state={state} />
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
