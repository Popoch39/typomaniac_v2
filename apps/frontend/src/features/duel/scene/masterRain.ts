import type { Drop } from "./diamondRain.ts";

/** The forty drops of the denser pixel rain of the Master scene, some in the action colour. */
export const MASTER_RAIN: readonly Drop[] = [
  { x: 97, size: 6, duration: 4.36, delay: 2.4, fill: "tier" },
  { x: 358, size: 8, duration: 2.69, delay: 4.52, fill: "action" },
  { x: 101, size: 6, duration: 4.14, delay: 4.56, fill: "ink" },
  { x: 461, size: 8, duration: 2.34, delay: 4.1, fill: "tier" },
  { x: 457, size: 6, duration: 2.36, delay: 3.9, fill: "tier" },
  { x: 619, size: 10, duration: 3.15, delay: 4.54, fill: "action" },
  { x: 247, size: 6, duration: 3.03, delay: 3.64, fill: "ink" },
  { x: 703, size: 10, duration: 3.59, delay: 3.4, fill: "tier" },
  { x: 851, size: 6, duration: 3.45, delay: 4.63, fill: "tier" },
  { x: 582, size: 8, duration: 2.34, delay: 4.52, fill: "action" },
  { x: 94, size: 12, duration: 3.59, delay: 4.38, fill: "ink" },
  { x: 160, size: 10, duration: 3.67, delay: 2.66, fill: "tier" },
  { x: 719, size: 12, duration: 4.11, delay: 4.55, fill: "tier" },
  { x: 494, size: 8, duration: 2.58, delay: 3.16, fill: "action" },
  { x: 574, size: 6, duration: 3.94, delay: 3.1, fill: "ink" },
  { x: 895, size: 12, duration: 2.52, delay: 4.45, fill: "tier" },
  { x: 203, size: 8, duration: 4.01, delay: 4.48, fill: "tier" },
  { x: 174, size: 6, duration: 4.08, delay: 3.63, fill: "action" },
  { x: 294, size: 8, duration: 4.08, delay: 2.44, fill: "ink" },
  { x: 1007, size: 6, duration: 4.32, delay: 3.29, fill: "tier" },
  { x: 214, size: 10, duration: 3.4, delay: 2.6, fill: "tier" },
  { x: 95, size: 10, duration: 2.27, delay: 2.95, fill: "action" },
  { x: 695, size: 10, duration: 3.3, delay: 3.1, fill: "ink" },
  { x: 811, size: 6, duration: 3.93, delay: 3.82, fill: "tier" },
  { x: 451, size: 10, duration: 2.68, delay: 3.08, fill: "tier" },
  { x: 429, size: 12, duration: 2.83, delay: 2.92, fill: "action" },
  { x: 5, size: 10, duration: 4.13, delay: 2.82, fill: "ink" },
  { x: 861, size: 6, duration: 4.01, delay: 2.94, fill: "tier" },
  { x: 485, size: 10, duration: 4.22, delay: 2.95, fill: "tier" },
  { x: 89, size: 10, duration: 3.68, delay: 4.27, fill: "action" },
  { x: 433, size: 6, duration: 3.16, delay: 2.49, fill: "ink" },
  { x: 994, size: 8, duration: 3.65, delay: 3.15, fill: "tier" },
  { x: 846, size: 8, duration: 3.11, delay: 3.12, fill: "tier" },
  { x: 873, size: 10, duration: 3.33, delay: 3.21, fill: "action" },
  { x: 78, size: 6, duration: 3.81, delay: 2.74, fill: "ink" },
  { x: 397, size: 12, duration: 2.34, delay: 4.31, fill: "tier" },
  { x: 26, size: 10, duration: 2.2, delay: 2.45, fill: "tier" },
  { x: 392, size: 6, duration: 2.69, delay: 4.78, fill: "action" },
  { x: 135, size: 12, duration: 2.71, delay: 2.85, fill: "ink" },
  { x: 726, size: 12, duration: 3.97, delay: 2.59, fill: "tier" },
];

export type Star = {
  /** The centre pixel of the star on the stage, in px. */
  readonly x: number;
  readonly y: number;
  /** One blink, off then on, repeated for as long as the scene stays open, in seconds. */
  readonly duration: number;
  /** Its first blink, from the opening of the scene, in seconds. */
  readonly delay: number;
};

/** The eighteen blinking stars of the Master scene, as placed on the canvas. */
export const MASTER_STARS: readonly Star[] = [
  { x: 257, y: 367, duration: 2.12, delay: 3.33 },
  { x: 403, y: 537, duration: 1.79, delay: 2.87 },
  { x: 54, y: 477, duration: 1.12, delay: 3.35 },
  { x: 712, y: 563, duration: 1.13, delay: 2.83 },
  { x: 300, y: 235, duration: 1.74, delay: 2.68 },
  { x: 802, y: 563, duration: 2.14, delay: 3.58 },
  { x: 126, y: 333, duration: 1.27, delay: 2.64 },
  { x: 203, y: 283, duration: 1.15, delay: 3.17 },
  { x: 294, y: 332, duration: 2.15, delay: 2.59 },
  { x: 306, y: 425, duration: 1.16, delay: 3.1 },
  { x: 735, y: 469, duration: 0.97, delay: 3.35 },
  { x: 437, y: 528, duration: 1.34, delay: 2.61 },
  { x: 977, y: 298, duration: 1.05, delay: 3.03 },
  { x: 166, y: 568, duration: 1.52, delay: 2.7 },
  { x: 825, y: 298, duration: 1.43, delay: 2.76 },
  { x: 284, y: 405, duration: 1.38, delay: 3.43 },
  { x: 938, y: 288, duration: 1.12, delay: 3.28 },
  { x: 811, y: 237, duration: 1.18, delay: 2.93 },
];
