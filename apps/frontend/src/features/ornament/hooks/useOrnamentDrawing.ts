import type { Ornament } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import { ornamentDrawing } from "../art/ornamentDrawing.ts";

/** `md` and `lg` draw the full Ornament, `sm` its chip form. */
export type OrnamentSize = "sm" | "md" | "lg";

// One pixel of the 64×76 grid is 1px at `sm`, 2px at `md` and 3px at `lg`.
const FRAME_SIZES = { sm: "h-19 w-16", md: "h-38 w-32", lg: "h-57 w-48" } as const;

// The Avatar fills the Ornament's 32×32 window at (16, 22) of the grid, flush: the frame around it
// already draws the key's outline, so the Avatar key keeps neither border nor edge.
const AVATAR_IN_WINDOW = "absolute [--keycap-border:0px] [--keycap-depth:0px]";

const AVATAR_SIZES = {
  sm: "top-[22px] left-4 size-8 rounded-[3px] text-sm",
  md: "top-[44px] left-8 size-16 rounded-[6px] text-2xl",
  lg: "top-[66px] left-12 size-24 rounded-[9px] text-4xl",
} as const;

// The size of the window, so that the Avatar's face keeps its size whether it wears an Ornament or not.
const BARE_AVATAR_SIZES = {
  sm: "size-8 text-sm",
  md: "size-16 text-2xl",
  lg: "size-24 text-4xl",
} as const;

// A bare Avatar keeps the frame's box, centred where the window would be, so that putting on or taking
// off an Ornament moves nothing around the Avatar.
const BARE_FRAME = "relative inline-flex shrink-0 items-center justify-center";

/**
 * What an Ornamented Avatar draws at a size: the Ornament, `null` for a bare Avatar, and where the
 * frame and the Avatar sit. `className` goes on the frame.
 */
export function useOrnamentDrawing(ornament: Ornament, size: OrnamentSize, className?: string) {
  if (ornament === null)
    return {
      drawing: null,
      frameClassName: cn(BARE_FRAME, FRAME_SIZES[size], className),
      avatarClassName: BARE_AVATAR_SIZES[size],
    };
  return {
    drawing: ornamentDrawing(ornament, size === "sm" ? "chip" : "full"),
    frameClassName: cn("relative inline-block shrink-0", FRAME_SIZES[size], className),
    avatarClassName: cn(AVATAR_IN_WINDOW, AVATAR_SIZES[size]),
  };
}
