import { useDuelBandSides } from "../hooks/useDuelBandSides.ts";
import { DuelBandCentre } from "./DuelBandCentre.tsx";
import { DuelBandSide } from "./DuelBandSide.tsx";

export function DuelBand() {
  const sides = useDuelBandSides();

  return (
    // The Participant always on the left, the Opponent mirrored on the right, whichever seat is held.
    // Tighter under xl, so that each side's fixed-width figures still fit beside the centre.
    <header className="grid grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] items-center gap-6 border-b-2 border-key-face pb-5 xl:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] xl:gap-10">
      <DuelBandSide side={sides.self} isOwn />
      <DuelBandCentre />
      <DuelBandSide side={sides.opponent} />
    </header>
  );
}
