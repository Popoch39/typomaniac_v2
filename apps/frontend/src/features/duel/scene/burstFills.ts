import type { BurstFill } from "./silverBursts.ts";

/** The class that fills a burst particle or a rain drop. */
export const BURST_FILL_CLASS_NAMES: Readonly<Record<BurstFill, string>> = {
  tier: "bg-(--rank-up-tier)",
  ink: "bg-ink",
  action: "bg-action",
};
