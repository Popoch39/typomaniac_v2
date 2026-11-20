import { cn } from "../lib/utils.ts";

const PIXEL_DELAYS = ["0s", "0.2s", "0.4s", "0.6s", "0.8s"];

interface LoadingPixelsProps {
  /** `sm` sits on a line of text, such as a Panel tag, without making it taller. */
  size?: "sm" | "md";
}

/** The design system's five blinking pixels: something is on its way. Still under reduced motion. */
export function LoadingPixels({ size = "md" }: LoadingPixelsProps) {
  const isSmall = size === "sm";

  return (
    <span
      aria-hidden="true"
      className={cn("flex items-center", isSmall ? "h-lh gap-1" : "gap-1.5")}
    >
      {PIXEL_DELAYS.map((delay) => (
        <span
          key={delay}
          className={cn(
            "animate-pixel-blink border-key-outline bg-key-face motion-reduce:animate-none",
            isSmall ? "size-2 border" : "size-3.5 border-2",
          )}
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
  );
}
