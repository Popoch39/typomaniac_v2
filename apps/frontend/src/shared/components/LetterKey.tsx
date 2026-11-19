import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "../lib/utils.ts";

const letterKeyVariants = cva(
  "keycap inline-grid shrink-0 place-items-center font-display leading-none select-none",
  {
    variants: {
      variant: {
        neutral: "bg-key-face text-ink",
        brand: "bg-brand text-on-key [--keycap-edge:var(--brand-edge)]",
        action: "bg-action text-on-key [--keycap-edge:var(--action-edge)]",
        loss: "bg-loss text-on-key [--keycap-edge:var(--loss-edge)]",
      },
      size: {
        sm: "size-11 rounded-md text-xl [--keycap-depth:4px]",
        md: "size-14 rounded-md text-[22px]",
        xl: "h-[clamp(48px,7.6vw,92px)] w-[clamp(44px,7vw,84px)] rounded-xl text-[clamp(26px,4.6vw,56px)] [--keycap-border:3px] [--keycap-depth:9px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "sm" },
  },
);

type LetterKeyProps = VariantProps<typeof letterKeyVariants> & {
  children: ReactNode;
  className?: string;
};

/** A square key holding one character, never pressed: a title's letter, an initial, a step number. */
export function LetterKey({ variant, size, className, children }: LetterKeyProps) {
  return (
    <span aria-hidden="true" className={cn(letterKeyVariants({ variant, size }), className)}>
      {children}
    </span>
  );
}
