import type { CSSProperties } from "react";
import type { TierPromotion } from "../rank/tierPromotion.ts";
import type { SceneTimings } from "../scene/tierScenes.ts";

// The first letter in the brand colour and the last in the action colour, as on the canvas.
const letterVariant = (index: number, count: number): "brand" | "action" | "neutral" =>
  index === 0 ? "brand" : index === count - 1 ? "action" : "neutral";

const delayed = (at: number): CSSProperties => ({ animationDelay: `${at}s` });

/** When the title and the line of the scene come in, and each letter key of a title in keys. */
export function useTierPromotionTitle({ title }: TierPromotion, timings: SceneTimings) {
  return {
    nameStyle: delayed(timings.titleAt),
    letters:
      title.kind === "keys"
        ? title.letters.map((letter, index) => ({
            letter,
            variant: letterVariant(index, title.letters.length),
            style: delayed(timings.titleAt + index * timings.letterStep),
          }))
        : [],
    lineStyle: delayed(timings.lineAt),
  };
}
