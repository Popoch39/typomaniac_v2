import type { ReactNode } from "react";
import { cn } from "../../../shared/lib/utils.ts";

interface DuelCaptionProps {
  children: ReactNode;
  className?: string;
}

/** The small uppercase caption heading each block of the Duel screen's body. */
export function DuelCaption({ children, className }: DuelCaptionProps) {
  return (
    <h2
      className={cn(
        "m-0 font-mono text-xs font-bold tracking-[.16em] text-ink-subtle uppercase",
        className,
      )}
    >
      {children}
    </h2>
  );
}
