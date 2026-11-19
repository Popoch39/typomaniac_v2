import { cn } from "../lib/utils.ts";

type BrandMarkProps = {
  className?: string;
};

/** The Typomaniac logo: a "t" in the text colour over a wave in the brand colour, the same wave that marks a wrong word. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d="M46 12 V50 Q46 60 56 60 H66" strokeWidth="12" className="stroke-foreground" />
      <path d="M30 30 H64" strokeWidth="12" className="stroke-foreground" />
      <path
        d="M16 82 Q24 72 32 82 T48 82 T64 82 T80 82"
        strokeWidth="7"
        className="stroke-primary"
      />
    </svg>
  );
}
