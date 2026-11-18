import { useDuelRankedEnd } from "../hooks/useDuelRankedEnd.ts";

export function DuelRankedEnd() {
  const ranked = useDuelRankedEnd();
  if (ranked === null) return null;

  return (
    <section className="flex flex-col gap-1" aria-label="Standing">
      <p className="font-heading text-2xl text-foreground">{ranked.headline}</p>
      {ranked.lpChange !== null && (
        <p className="font-mono text-xl text-primary">{ranked.lpChange}</p>
      )}
      <p className="text-base text-muted-foreground">{ranked.detail}</p>
    </section>
  );
}
