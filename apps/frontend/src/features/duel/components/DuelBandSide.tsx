import { cn } from "../../../shared/lib/utils.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { BandSide } from "../hooks/useDuelBandSides.ts";

interface DuelBandSideProps {
  side: BandSide;
  isOwn?: boolean;
}

// Every slot keeps its box whatever it holds: the Avatar its frame before the Participant arrives,
// the name and the Rank line their line height, the Multiplier, the Points and the Lead fixed widths
// of monospaced figures, so the band never moves while the numbers change or a Streak resets.
// Under xl the Avatar is zoomed to half, since `zoom` shrinks its box and not just its drawing; under lg
// it is left out, so the figures keep their room and the name truncates first.
export function DuelBandSide({ side, isOwn = false }: DuelBandSideProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 xl:gap-5", !isOwn && "flex-row-reverse")}>
      <OrnamentedAvatar
        player={side.player}
        ornament={side.ornament}
        size="md"
        isOwn={isOwn}
        className={cn(
          "max-lg:hidden max-xl:[zoom:0.5]",
          !side.isKnown && "invisible",
          side.isAway && "opacity-50 grayscale",
        )}
      />
      <div className={cn("flex min-w-0 flex-col gap-1.5", !isOwn && "items-end")}>
        <span
          className={cn(
            "min-h-lh max-w-full truncate text-[22px] leading-none font-extrabold",
            isOwn ? "text-action" : "text-opponent",
          )}
        >
          {side.name}
        </span>
        <span
          aria-live="polite"
          className="min-h-lh font-mono text-[13px] font-bold text-ink-subtle tabular-nums"
        >
          {side.rankLine}
        </span>
      </div>
      <span className="grow" />
      <div
        className={cn(
          "flex items-baseline gap-2.5 font-mono font-bold tabular-nums",
          !isOwn && "flex-row-reverse",
        )}
      >
        <span
          className={cn(
            "w-[5ch] text-[15px] text-ink-muted",
            isOwn ? "text-right" : "text-left",
            side.multiplier === null && "invisible",
          )}
        >
          <span className="sr-only">Multiplier </span>
          {side.multiplier}
        </span>
        <span
          className={cn(
            "w-[6ch] text-[15px]",
            isOwn ? "text-right text-action" : "text-left text-opponent",
          )}
        >
          {side.lead !== null && (
            <>
              <span aria-hidden="true">+{side.lead}</span>
              <span className="sr-only">Leads by {side.lead} Points</span>
            </>
          )}
        </span>
        <span
          className={cn(
            "w-[4ch] text-[30px] leading-none text-ink xl:text-[44px]",
            isOwn ? "text-right" : "text-left",
          )}
        >
          {side.points}
          <span className="sr-only"> Points</span>
        </span>
      </div>
    </div>
  );
}
