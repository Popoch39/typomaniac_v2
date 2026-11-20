import type { ReactNode } from "react";

interface SectionHeaderProps {
  titleId: string;
  title: string;
  aside: ReactNode;
}

export function SectionHeader({ titleId, title, aside }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <h2 id={titleId} className="m-0 type-section-title font-normal text-ink">
        {title}
      </h2>
      <span className="type-eyebrow text-ink-subtle">{aside}</span>
    </div>
  );
}
