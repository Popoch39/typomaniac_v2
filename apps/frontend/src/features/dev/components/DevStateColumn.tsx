import type { ReactNode } from "react";

interface DevStateColumnProps {
  label: string;
  children: ReactNode;
}

// Spaced as a Page, so that the states line up with the real page they stand in for.
export function DevStateColumn({ label, children }: DevStateColumnProps) {
  return (
    <div className="flex min-w-0 flex-col gap-10">
      <h3 className="m-0 type-eyebrow text-ink-subtle">{label}</h3>
      {children}
    </div>
  );
}
