import type { PromotedTier } from "../rank/tierPromotion.ts";
import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionScene } from "../hooks/useTierPromotionScene.ts";
import { TierPromotionContinue } from "./TierPromotionContinue.tsx";
import { TierPromotionEffects } from "./TierPromotionEffects.tsx";
import { TierPromotionHero } from "./TierPromotionHero.tsx";
import { TierPromotionTitle } from "./TierPromotionTitle.tsx";

const TIER_COLOURS: Readonly<Record<PromotedTier, string>> = {
  silver: "[--rank-up-tier:var(--tier-silver)]",
  gold: "[--rank-up-tier:var(--tier-gold)]",
  platinum: "[--rank-up-tier:var(--tier-platinum)]",
  diamond: "[--rank-up-tier:var(--tier-diamond)]",
  master: "[--rank-up-tier:var(--tier-master)]",
};

/**
 * The Rank up scene of a Tier promotion, over the Duel end screen: mounted only while open, so that
 * every animation starts from its first frame, and contained so that it never lays out the screen
 * underneath. The 1040 × 680 stage is centred and scaled down to fit the viewport.
 */
export function TierPromotionScene() {
  const { promotion, timings, player, isContinueReady, onContinueShown, onContinue, onKeyDown } =
    useTierPromotionScene();
  if (promotion === null || timings === null) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={promotion.announcement}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 overflow-hidden bg-surface-plate outline-none plate-dots contain-strict @container-size"
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 h-[680px] w-[1040px] -translate-1/2 overflow-hidden rank-up-fit",
          TIER_COLOURS[promotion.tier],
        )}
      >
        <TierPromotionEffects tier={promotion.tier} />
        <TierPromotionHero player={player} promotion={promotion} />
        <TierPromotionTitle promotion={promotion} timings={timings} />
        <p className="absolute top-7 left-10 m-0 text-ink-subtle type-eyebrow">Rank up</p>
        <TierPromotionContinue
          isReady={isContinueReady}
          at={timings.continueAt}
          onShown={onContinueShown}
          onContinue={onContinue}
        />
      </div>
    </div>
  );
}
