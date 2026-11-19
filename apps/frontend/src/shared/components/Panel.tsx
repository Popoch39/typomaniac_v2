import type { ReactNode } from "react";
import { cn } from "../lib/utils.ts";

interface PanelProps {
  title?: string;
  /** A short mono tag at the top right, such as "Best of 3". */
  tag?: string;
  /** Keeps the tag's room while it is not shown, for a tag that comes and goes, such as "Saving…". */
  isTagHidden?: boolean;
  /** Without depth, a panel lies flat on the plate, for a frame that is not a card of its own. */
  flat?: boolean;
  className?: string;
  children: ReactNode;
}

/** A card on the plate, opened by an eyebrow title and, on the right, a tag. */
export function Panel({
  title,
  tag,
  isTagHidden = false,
  flat = false,
  className,
  children,
}: PanelProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-6 rounded-3xl border-3 border-key-outline bg-surface-card p-7 text-ink",
        !flat && "keycap [--keycap-border:3px] [--keycap-depth:10px]",
        className,
      )}
    >
      {(title !== undefined || tag !== undefined) && (
        <div className="flex items-center justify-between gap-3">
          {title !== undefined && <h2 className="m-0 type-eyebrow text-ink-subtle">{title}</h2>}
          {tag !== undefined && (
            <span
              className={cn(
                "ml-auto shrink-0 rounded-sm border-2 border-key-outline bg-key-face px-2.5 py-1 type-mono-sm whitespace-nowrap text-ink uppercase",
                isTagHidden && "invisible",
              )}
            >
              {tag}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
