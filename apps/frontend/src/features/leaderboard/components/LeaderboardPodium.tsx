import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { usePodiumSteps } from "../hooks/usePodiumSteps.ts";
import { PodiumStep } from "./PodiumStep.tsx";

interface LeaderboardPodiumProps {
  podium: LeaderboardPlayer[];
  own: LeaderboardPlayer | null;
}

// In Position order for screen readers and on a phone; wider, the 2nd step moves left of the 1st.
export function LeaderboardPodium({ podium, own }: LeaderboardPodiumProps) {
  const steps = usePodiumSteps(podium, own);

  return (
    <section aria-labelledby="podium-title" className="flex flex-col gap-7">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="podium-title" className="m-0 type-section-title font-normal text-ink">
          The podium
        </h2>
        <span className="type-eyebrow text-ink-subtle">Top 3 Players</span>
      </div>
      <ol className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3 md:items-end md:gap-7">
        {steps.map((step) => (
          <PodiumStep key={step.position} {...step} />
        ))}
      </ol>
    </section>
  );
}
