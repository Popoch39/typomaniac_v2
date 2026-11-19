import { LetterKey } from "../../../shared/components/LetterKey.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import type { TierPromotion } from "../rank/tierPromotion.ts";
import type { SceneTimings } from "../scene/sceneTimings.ts";

interface TierPromotionTitleProps {
  promotion: TierPromotion;
  timings: SceneTimings;
}

// The first letter in the brand colour and the last in the action colour, as on the canvas.
const letterVariant = (index: number, count: number) =>
  index === 0 ? "brand" : index === count - 1 ? "action" : "neutral";

/** The new Rank as the title of the scene, and the Rank the Participant was promoted from. */
export function TierPromotionTitle({ promotion, timings }: TierPromotionTitleProps) {
  const { tier, title, line } = promotion;

  return (
    <div className="absolute inset-x-0 top-[470px] flex flex-col items-center gap-2.5 text-center">
      <div
        className="flex items-center justify-center gap-4 rank-up-rise"
        style={{ animationDelay: `${timings.titleAt}s` }}
      >
        {title.kind === "name" ? (
          <>
            <TierBadge tier={tier} size="sm" />
            <h1 className="m-0 font-display text-[48px] leading-none text-ink">{title.name}</h1>
          </>
        ) : (
          <h1 className="m-0 flex gap-2 pb-2.5">
            <span className="sr-only">{title.letters.join("")}</span>
            {title.letters.map((letter, index) => (
              <LetterKey key={index} variant={letterVariant(index, title.letters.length)} size="md">
                {letter}
              </LetterKey>
            ))}
          </h1>
        )}
      </div>
      <p
        className="m-0 text-sm text-ink-subtle rank-up-rise"
        style={{ animationDelay: `${timings.lineAt}s` }}
      >
        {line}
      </p>
    </div>
  );
}
