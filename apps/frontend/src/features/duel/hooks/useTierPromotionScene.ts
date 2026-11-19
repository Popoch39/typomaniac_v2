import { useState, useSyncExternalStore, type AnimationEvent, type KeyboardEvent } from "react";
import { SCENE_TIMINGS } from "../scene/sceneTimings.ts";
import { useTierPromotionStore } from "../store/useTierPromotionStore.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The Rank up scene of the Participant's Tier promotion, `promotion` `null` while it is closed.
 * Continue is available once the entrance has played, or at once under reduced motion; Continue,
 * Enter and Escape close it then.
 */
export function useTierPromotionScene() {
  const promotion = useTierPromotionStore((state) => state.promotion);
  const dismiss = useTierPromotionStore((state) => state.dismiss);
  const { self } = useDuelParticipants();
  const isMotionReduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedMotionQuery).matches,
  );
  const [hasEntered, setHasEntered] = useState(false);
  const isContinueReady = isMotionReduced || hasEntered;
  return {
    promotion,
    timings: promotion === null ? null : SCENE_TIMINGS[promotion.tier],
    player: { nickname: self?.name ?? null, avatarUrl: self?.avatarUrl ?? null },
    isContinueReady,
    // Only the appearance of Continue itself, not an animation bubbling from inside it.
    onContinueShown: (event: AnimationEvent) => {
      if (event.target === event.currentTarget) setHasEntered(true);
    },
    onContinue: dismiss,
    onKeyDown: (event: KeyboardEvent) => {
      if (!isContinueReady || (event.key !== "Enter" && event.key !== "Escape")) return;
      event.preventDefault();
      dismiss();
    },
  };
}
