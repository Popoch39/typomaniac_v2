import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils.ts";

const keycapVariants = cva(
  "keycap key-travel inline-flex shrink-0 cursor-pointer items-center justify-center font-display leading-none whitespace-nowrap no-underline select-none hover:-translate-y-px active:keycap-pressed disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:translate-y-0 motion-reduce:hover:translate-y-0 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-key-face text-ink",
        brand: "bg-brand text-on-key [--keycap-edge:var(--brand-edge)]",
        action: "bg-action text-on-key [--keycap-edge:var(--action-edge)]",
        loss: "bg-loss text-on-key [--keycap-edge:var(--loss-edge)]",
      },
      size: {
        sm: "min-h-11 gap-2.5 rounded-md px-4 text-base [--keycap-depth:4px]",
        md: "min-h-14 gap-2.5 rounded-md px-5 text-xl",
        lg: "min-h-16 gap-2.5 rounded-xl px-7 text-xl [--keycap-border:3px] [--keycap-depth:7px]",
        xl: "min-h-21 gap-3.5 rounded-2xl px-8 text-[clamp(22px,2.6vw,30px)] tracking-[0.02em] [--keycap-border:3px] [--keycap-depth:8px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

type KeycapProps = ComponentProps<"button"> &
  VariantProps<typeof keycapVariants> & {
    /** Renders its single child (a router Link, say) as the key, rather than a button. */
    asChild?: boolean;
  };

/**
 * Everything the Player can press: a face over a hard edge, lifted on hover, sunk when pressed. Its
 * parent must leave room for the edge below it, as much padding as the key is deep.
 */
export function Keycap({ className, variant, size, asChild = false, ...props }: KeycapProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(keycapVariants({ variant, size }), className)} {...props} />;
}
