import type { AnimationEvent } from "react";
import { Keycap } from "../../../shared/components/Keycap.tsx";

interface TierPromotionContinueProps {
  isReady: boolean;
  /** When it shows, in seconds from the opening of the scene. */
  at: number;
  onShown: (event: AnimationEvent) => void;
  onContinue: () => void;
}

/**
 * Continue keeps its box from the start, hidden and inert until the entrance has played; it is then
 * mounted again to take the focus.
 */
export function TierPromotionContinue({
  isReady,
  at,
  onShown,
  onContinue,
}: TierPromotionContinueProps) {
  return (
    // Room under the key for its edge.
    <div
      className="absolute right-10 bottom-6 pb-1 rank-up-appear"
      style={{ animationDelay: `${at}s` }}
      onAnimationEnd={onShown}
    >
      {isReady ? (
        <Keycap key="ready" variant="action" size="sm" autoFocus onClick={onContinue}>
          Continue
        </Keycap>
      ) : (
        <Keycap key="waiting" variant="action" size="sm" inert>
          Continue
        </Keycap>
      )}
    </div>
  );
}
