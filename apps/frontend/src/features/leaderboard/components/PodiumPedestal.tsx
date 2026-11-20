import { cn } from "../../../shared/lib/utils.ts";

interface PodiumPedestalProps {
  position: 1 | 2 | 3;
}

const PEDESTAL_HEIGHTS = { 1: "md:h-46", 2: "md:h-33", 3: "md:h-24" } as const;

export function PodiumPedestal({ position }: PodiumPedestalProps) {
  const isFirst = position === 1;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "keycap mt-1.5 flex h-21 items-start justify-center self-stretch rounded-2xl pt-4.5 [--keycap-border:3px] [--keycap-depth:10px]",
        PEDESTAL_HEIGHTS[position],
        isFirst ? "bg-brand [--keycap-edge:var(--brand-edge)]" : "bg-key-face",
      )}
    >
      <span
        className={cn(
          "font-display text-5xl leading-none md:text-[64px]",
          isFirst ? "text-on-key" : "text-ink",
        )}
      >
        {position}
      </span>
    </div>
  );
}
