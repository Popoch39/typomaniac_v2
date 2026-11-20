import { Keycap } from "../../../shared/components/Keycap.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { useDevRankUp } from "../hooks/useDevRankUp.ts";
import { TierPromotionScene } from "./TierPromotionScene.tsx";

/** A dev-only page that opens the Rank up scene of each Tier promotion on demand. */
export function DevRankUpPage() {
  const { scenes } = useDevRankUp();

  return (
    <main className="flex min-h-svh flex-col gap-10 bg-surface-plate p-10 plate-dots">
      <PageHeader title="Rank up" />
      <div className="flex flex-wrap gap-4">
        {scenes.map(({ tier, label, onPlay }) => (
          <Keycap key={tier} onClick={onPlay}>
            {label}
          </Keycap>
        ))}
      </div>
      <TierPromotionScene />
    </main>
  );
}
