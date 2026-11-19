import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { usePodiumSteps } from "../hooks/usePodiumSteps.ts";
import { PodiumStep } from "./PodiumStep.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

interface LeaderboardPodiumProps {
  podium: LeaderboardPlayer[];
  own: LeaderboardPlayer | null;
}

// In Position order for screen readers and on a phone; wider, the 2nd step moves left of the 1st.
export function LeaderboardPodium({ podium, own }: LeaderboardPodiumProps) {
  const steps = usePodiumSteps(podium, own);

  return (
    <section aria-labelledby="podium-title" className="flex flex-col gap-7">
      <SectionHeader titleId="podium-title" title="The podium" aside="Top 3 Players" />
      <ol className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3 md:items-end md:gap-7">
        {steps.map((step) => (
          <PodiumStep key={step.position} {...step} />
        ))}
      </ol>
    </section>
  );
}
