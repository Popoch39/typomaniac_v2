import { type AnimationEvent, type CSSProperties, type KeyboardEvent, useState } from "react";
import { useReducedMotion } from "../../../shared/hooks/useReducedMotion.ts";
import { TIER_SCENES } from "../scene/tierScenes.ts";
import { useTierPromotionStore } from "../store/useTierPromotionStore.ts";

// The scene is a modal dialog: the focus moves into it as it opens, so that no key reaches the end
// screen behind it. Stable, so that it runs once, when the dialog mounts; a Continue already focused
// at mount, under reduced motion, keeps the focus.
const focusOnOpen = (dialog: HTMLElement | null) => {
  if (dialog !== null && !dialog.contains(document.activeElement)) dialog.focus();
};

/**
 * The Rank up scene of the Participant's Tier promotion, `null` while it is closed. Continue is
 * available once the entrance has played, or at once under reduced motion; Continue, Enter and
 * Escape close it then.
 */
export function useTierPromotionScene() {
  const promotion = useTierPromotionStore((state) => state.promotion);
  const dismiss = useTierPromotionStore((state) => state.dismiss);
  const isMotionReduced = useReducedMotion();
  const [hasEntered, setHasEntered] = useState(false);
  if (promotion === null) return null;

  const { colourClassName, timings, hasSideKeys, effects } = TIER_SCENES[promotion.tier];
  const isContinueReady = isMotionReduced || hasEntered;
  const { shake } = timings;
  return {
    promotion,
    colourClassName,
    timings,
    shakeStyle:
      shake === null
        ? null
        : ({
            animationDelay: `${shake.at}s`,
            animationDuration: `${shake.duration}s`,
          } satisfies CSSProperties),
    hasSideKeys,
    isBurstOverHero: effects.isBurstOverHero,
    isContinueReady,
    focusOnOpen,
    // Only the appearance of Continue itself, not an animation bubbling from inside it.
    onContinueShown: (event: AnimationEvent) => {
      if (event.target === event.currentTarget) setHasEntered(true);
    },
    onContinue: dismiss,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      // Tab stays in the dialog, on Continue, its only key; while Continue waits, it is inert and the
      // focus stays on the dialog itself.
      if (event.key === "Tab") {
        event.preventDefault();
        event.currentTarget.querySelector("button")?.focus();
        return;
      }
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      if (isContinueReady) dismiss();
    },
  };
}
