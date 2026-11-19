import type { Ornament } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import { ornamentDrawing } from "../art/ornamentDrawing.ts";

/** `lg` draws the full Ornament, `sm` its chip form. */
export type OrnamentSize = "sm" | "lg";

// One pixel of the 64×76 grid is 1px at `sm` and 3px at `lg`.
const FRAME_SIZES = { sm: "h-19 w-16", lg: "h-57 w-48" } as const;

// The Avatar fills the Ornament's 32×32 window at (16, 22) of the grid, flush: the frame around it
// already draws the key's outline, so the Avatar key keeps neither border nor edge.
const AVATAR_IN_WINDOW = "absolute [--keycap-border:0px] [--keycap-depth:0px]";

const AVATAR_SIZES = {
  sm: "top-[22px] left-4 size-8 rounded-[3px] text-sm",
  lg: "top-[66px] left-12 size-24 rounded-[9px] text-4xl",
} as const;

const BARE_AVATAR_SIZES = { sm: "", lg: "size-24 text-4xl" } as const;

/**
 * What an Ornamented Avatar draws at a size: the Ornament, `null` for a bare Avatar, and where the
 * frame and the Avatar sit. `className` goes on the outermost element, the Avatar when it is bare.
 */
export function useOrnamentDrawing(ornament: Ornament, size: OrnamentSize, className?: string) {
  if (ornament === null)
    return {
      drawing: null,
      frameClassName: undefined,
      avatarClassName: cn(BARE_AVATAR_SIZES[size], className),
    };
  return {
    drawing: ornamentDrawing(ornament, size === "lg" ? "full" : "chip"),
    frameClassName: cn("relative inline-block shrink-0", FRAME_SIZES[size], className),
    avatarClassName: cn(AVATAR_IN_WINDOW, AVATAR_SIZES[size]),
  };
}
