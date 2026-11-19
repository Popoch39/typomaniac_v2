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
      {title.kind === "name" ? (
        <div
          className="flex items-center justify-center gap-4 rank-up-rise"
          style={{ animationDelay: `${timings.titleAt}s` }}
        >
          <TierBadge tier={tier} size="sm" />
          <h1 className="m-0 font-display text-[48px] leading-none text-ink">{title.name}</h1>
        </div>
      ) : (
        <h1 className="m-0 flex justify-center gap-2 pb-2.5">
          <span className="sr-only">{title.letters.join("")}</span>
          {title.letters.map((letter, index) => (
            <span
              key={index}
              className="inline-block rank-up-drop"
              style={{ animationDelay: `${timings.titleAt + index * timings.letterStep}s` }}
            >
              <LetterKey variant={letterVariant(index, title.letters.length)} size="lg">
                {letter}
              </LetterKey>
            </span>
          ))}
        </h1>
      )}
      <p
        className="m-0 flex items-baseline justify-center gap-2.5 rank-up-rise"
        style={{ animationDelay: `${timings.lineAt}s` }}
      >
        {title.kind === "keys" && (
          <span className="font-display text-base text-(--rank-up-tier)">{title.name}</span>
        )}
        <span className="text-sm text-ink-subtle">{line}</span>
      </p>
    </div>
  );
}
