import type { ReactNode } from "react";
import { cn } from "../lib/utils.ts";

interface StrokeIconProps {
  /** Heavier on a large key, where the usual stroke looks thin. */
  heavy?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The frame of every icon: geometric strokes with round ends in the text colour of their key. Always
 * decorative, next to a label that names what it stands for.
 */
export function StrokeIcon({ heavy = false, className, children }: StrokeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={heavy ? 2.6 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 shrink-0", className)}
    >
      {children}
    </svg>
  );
}
