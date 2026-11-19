import { LetterKey } from "../../../shared/components/LetterKey.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import { useTierPromotionTitle } from "../hooks/useTierPromotionTitle.ts";
import type { TierPromotion } from "../rank/tierPromotion.ts";
import type { SceneTimings } from "../scene/tierScenes.ts";

interface TierPromotionTitleProps {
  promotion: TierPromotion;
  timings: SceneTimings;
}

/** The new Rank as the title of the scene, and the Rank the Participant was promoted from. */
export function TierPromotionTitle({ promotion, timings }: TierPromotionTitleProps) {
  const { tier, title, line } = promotion;
  const { nameStyle, letters, lineStyle } = useTierPromotionTitle(promotion, timings);

  return (
    <div className="absolute inset-x-0 top-[470px] flex flex-col items-center gap-2.5 text-center">
      {title.kind === "name" ? (
        <div className="flex items-center justify-center gap-4 rank-up-rise" style={nameStyle}>
          <TierBadge tier={tier} size="sm" />
          <h1 className="m-0 font-display text-[48px] leading-none text-ink">{title.name}</h1>
        </div>
      ) : (
        <h1 className="m-0 flex justify-center gap-2 pb-2.5">
          <span className="sr-only">{title.letters.join("")}</span>
          {letters.map(({ letter, variant, style }, index) => (
            <span key={index} className="inline-block rank-up-drop" style={style}>
              <LetterKey variant={variant} size="lg">
                {letter}
              </LetterKey>
            </span>
          ))}
        </h1>
      )}
      <p className="m-0 flex items-baseline justify-center gap-2.5 rank-up-rise" style={lineStyle}>
        {title.kind === "keys" && (
          <span className="font-display text-base text-(--rank-up-tier)">{title.name}</span>
        )}
        <span className="text-sm text-ink-subtle">{line}</span>
      </p>
    </div>
  );
}
