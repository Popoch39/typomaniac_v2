import type { BurstFill } from "./silverBursts.ts";

export type Drop = {
  /** The column the drop falls down, from the left of the stage, in px. */
  readonly x: number;
  readonly size: number;
  /** One fall across the stage, in seconds; it falls again for as long as the scene stays open. */
  readonly duration: number;
  /** Its first fall, from the opening of the scene, in seconds. */
  readonly delay: number;
  readonly fill: BurstFill;
};

/** The twenty-six drops of the pixel rain of the Diamond scene, as placed on the canvas. */
export const DIAMOND_RAIN: readonly Drop[] = [
  { x: 747, size: 6, duration: 2.73, delay: 4.25, fill: "tier" },
  { x: 368, size: 10, duration: 3.3, delay: 2.73, fill: "tier" },
  { x: 886, size: 6, duration: 2.34, delay: 2.59, fill: "ink" },
  { x: 657, size: 8, duration: 2.53, delay: 4.23, fill: "tier" },
  { x: 395, size: 8, duration: 4.13, delay: 2.39, fill: "tier" },
  { x: 363, size: 12, duration: 3.85, delay: 3.65, fill: "ink" },
  { x: 484, size: 10, duration: 4.36, delay: 3.27, fill: "tier" },
  { x: 225, size: 10, duration: 2.82, delay: 4.11, fill: "tier" },
  { x: 417, size: 6, duration: 4.35, delay: 2.77, fill: "ink" },
  { x: 288, size: 12, duration: 3.23, delay: 2.91, fill: "tier" },
  { x: 544, size: 12, duration: 3.07, delay: 3.64, fill: "tier" },
  { x: 163, size: 6, duration: 2.38, delay: 2.54, fill: "ink" },
  { x: 294, size: 12, duration: 2.42, delay: 3.3, fill: "tier" },
  { x: 365, size: 6, duration: 2.21, delay: 3.81, fill: "tier" },
  { x: 311, size: 6, duration: 3.45, delay: 3.91, fill: "ink" },
  { x: 656, size: 8, duration: 2.52, delay: 2.76, fill: "tier" },
  { x: 578, size: 6, duration: 4.22, delay: 4.48, fill: "tier" },
  { x: 497, size: 6, duration: 2.54, delay: 3.28, fill: "ink" },
  { x: 639, size: 6, duration: 3.95, delay: 4.01, fill: "tier" },
  { x: 578, size: 8, duration: 4.25, delay: 2.34, fill: "tier" },
  { x: 912, size: 10, duration: 2.29, delay: 3.56, fill: "ink" },
  { x: 335, size: 12, duration: 4.37, delay: 2.88, fill: "tier" },
  { x: 998, size: 6, duration: 2.65, delay: 2.48, fill: "tier" },
  { x: 626, size: 10, duration: 3.45, delay: 4.14, fill: "ink" },
  { x: 97, size: 6, duration: 4.03, delay: 3.14, fill: "tier" },
  { x: 358, size: 8, duration: 3.62, delay: 2.88, fill: "tier" },
];
