import { cn } from "../../../shared/lib/utils.ts";
import { LpBar } from "../../../shared/components/LpBar.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import { useDuelRankedEnd } from "../hooks/useDuelRankedEnd.ts";
import type { LpTone } from "../rank/rankedEndBlock.ts";

const TONES: Readonly<Record<LpTone, string>> = {
  gain: "text-action",
  loss: "text-danger",
  none: "text-ink-subtle",
};

export function DuelRankedEnd() {
  const { isRanked, block } = useDuelRankedEnd();
  if (!isRanked) return null;

  return (
    // Both rows keep a fixed height, whether the server has ended the Duel yet or not, and whether the
    // LP bar or the Placement progress fills the second one: the block never moves what is around it.
    <section aria-label="Standing" className="flex w-110 max-w-full flex-col gap-3">
      <div className="flex h-14 items-center justify-center gap-3">
        {block && <TierBadge tier={block.tier} size="sm" />}
        <p className="m-0 flex items-baseline gap-2.5 font-mono font-bold tabular-nums">
          {block?.lpDelta && (
            <>
              <span className={cn("text-[40px] leading-none", TONES[block.lpDelta.tone])}>
                {block.lpDelta.amount}
              </span>
              <span className="text-lg text-ink-muted">LP</span>
            </>
          )}
          <span
            className={cn(
              "text-sm [&:not(:first-child)]:ml-2",
              block?.isAnnounced ? "text-ink" : "text-ink-subtle",
            )}
          >
            {block?.standing}
          </span>
        </p>
      </div>
      <div className="h-14">
        {block?.progress && (
          <LpBar lp={block.progress.lp} from={block.progress.from} next={block.progress.next} />
        )}
        {block?.placement && (
          <p className="m-0 font-mono text-sm font-bold text-ink-subtle">{block.placement}</p>
        )}
      </div>
    </section>
  );
}
