import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionScene } from "../hooks/useTierPromotionScene.ts";
import { TierPromotionBackdrop } from "./TierPromotionBackdrop.tsx";
import { TierPromotionBursts } from "./TierPromotionBursts.tsx";
import { TierPromotionContinue } from "./TierPromotionContinue.tsx";
import { TierPromotionHero } from "./TierPromotionHero.tsx";
import { TierPromotionRings } from "./TierPromotionRings.tsx";
import { TierPromotionSideKeys } from "./TierPromotionSideKeys.tsx";
import { TierPromotionTitle } from "./TierPromotionTitle.tsx";

/**
 * The Rank up scene of a Tier promotion, over the Duel end screen: mounted only while open, so that
 * every animation starts from its first frame, and contained so that it never lays out the screen
 * underneath. The 1040 × 680 stage is centred and scaled to cover the viewport; the eyebrow and
 * Continue sit in the corners of the viewport, as the edges of the stage can be cut off.
 */
export function TierPromotionScene() {
  const scene = useTierPromotionScene();
  if (scene === null) return null;
  const { promotion, timings, shakeStyle, isBurstOverHero, focusOnOpen } = scene;

  return (
    <div
      ref={focusOnOpen}
      role="dialog"
      aria-modal="true"
      aria-label={promotion.announcement}
      tabIndex={-1}
      onKeyDown={scene.onKeyDown}
      className="fixed inset-0 z-50 overflow-hidden bg-surface-plate outline-none plate-dots contain-strict @container-size"
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 h-[680px] w-[1040px] -translate-1/2 rank-up-fit",
          scene.colourClassName,
        )}
      >
        {/* The shake moves the Ornament, its effects and the title, never the keys at the edges. The
            layers stack as on the canvas: the burst flies behind the Ornament up to Gold, over it
            from Platinum on. */}
        <div
          className={cn("absolute inset-0", shakeStyle !== null && "rank-up-shake")}
          style={shakeStyle ?? undefined}
        >
          <TierPromotionBackdrop tier={promotion.tier} />
          {scene.hasSideKeys && <TierPromotionSideKeys />}
          <TierPromotionRings tier={promotion.tier} />
          {!isBurstOverHero && <TierPromotionBursts tier={promotion.tier} />}
          <TierPromotionHero promotion={promotion} />
          {isBurstOverHero && <TierPromotionBursts tier={promotion.tier} />}
          <TierPromotionTitle promotion={promotion} timings={timings} />
        </div>
      </div>
      <p className="absolute top-7 left-10 m-0 text-ink-subtle type-eyebrow">Rank up</p>
      <TierPromotionContinue
        isReady={scene.isContinueReady}
        at={timings.continueAt}
        onShown={scene.onContinueShown}
        onContinue={scene.onContinue}
      />
    </div>
  );
}
