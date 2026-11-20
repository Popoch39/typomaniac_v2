import { PodiumStepSkeleton } from "./PodiumStepSkeleton.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

const POSITIONS = [1, 2, 3] as const;

export function PodiumSkeleton() {
  return (
    <section className="flex flex-col gap-7">
      <SectionHeader titleId="podium-skeleton-title" title="The podium" aside="Top 3 Players" />
      <ol className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3 md:items-end md:gap-7">
        {POSITIONS.map((position) => (
          <PodiumStepSkeleton key={position} position={position} />
        ))}
      </ol>
    </section>
  );
}
