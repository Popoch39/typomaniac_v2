import { cn } from "../lib/utils.ts";

interface SkeletonBlockProps {
  /** Its size, at the final size of what it stands in for, and its radius when not the default. */
  className?: string;
}

/**
 * A recessed block standing in for data still being read. It stays still: the loading pixels alone
 * say the page is working. A line of text is matched with `h-lh` and the text's own font size.
 */
export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-md border-2 border-key-outline bg-surface-plate", className)}
    />
  );
}
