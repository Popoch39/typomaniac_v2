import type { PairingSide } from "@repo/matchmaking-engine";
import { PairingSideCard } from "./PairingSideCard.tsx";

interface PairingSidesProps {
  players: { readonly self: PairingSide; readonly opponent: PairingSide };
}

// Both sides at the same size, so that the two Ranks compare honestly.
export function PairingSides({ players }: PairingSidesProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <PairingSideCard side={players.self} isOwn />
      <span className="type-eyebrow text-ink-subtle">VS</span>
      <PairingSideCard side={players.opponent} />
    </div>
  );
}
