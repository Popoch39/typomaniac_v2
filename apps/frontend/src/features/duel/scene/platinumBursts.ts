import type { Burst } from "./silverBursts.ts";

/** When the rings, the burst, the rays and the grid of the Platinum scene go off, in seconds. */
export const PLATINUM_BURST_AT = 1.32;

/** The three rings of the Platinum scene, after the burst starts, in seconds. */
export const PLATINUM_RINGS: readonly number[] = [0, 0.12, 0.24];

/** The twenty-eight particles of the Platinum burst, as placed on the canvas. */
export const PLATINUM_BURSTS: readonly Burst[] = [
  { x: 2, y: 150, delay: 0.12, duration: 1.43, size: 16, fill: "tier" },
  { x: -89, y: 199, delay: 0.04, duration: 1.49, size: 8, fill: "tier" },
  { x: 31, y: -242, delay: 0.04, duration: 1.52, size: 8, fill: "ink" },
  { x: 286, y: -215, delay: 0.03, duration: 1.75, size: 8, fill: "tier" },
  { x: -97, y: 99, delay: 0.09, duration: 1.73, size: 16, fill: "action" },
  { x: 203, y: -278, delay: 0.02, duration: 1.5, size: 8, fill: "tier" },
  { x: -21, y: -203, delay: 0.05, duration: 1.26, size: 8, fill: "tier" },
  { x: 346, y: 103, delay: 0.09, duration: 1.44, size: 12, fill: "ink" },
  { x: -225, y: 95, delay: 0.03, duration: 1.21, size: 8, fill: "tier" },
  { x: 145, y: 91, delay: 0.02, duration: 1.32, size: 8, fill: "action" },
  { x: -302, y: -17, delay: 0.03, duration: 1.32, size: 16, fill: "tier" },
  { x: 98, y: 133, delay: 0.02, duration: 1.67, size: 8, fill: "tier" },
  { x: -241, y: -57, delay: 0.08, duration: 1.31, size: 8, fill: "ink" },
  { x: 236, y: -43, delay: 0.1, duration: 1.36, size: 12, fill: "tier" },
  { x: 372, y: 49, delay: 0.04, duration: 1.33, size: 8, fill: "action" },
  { x: -196, y: -159, delay: 0.02, duration: 1.35, size: 16, fill: "tier" },
  { x: 194, y: -17, delay: 0.03, duration: 1.74, size: 16, fill: "tier" },
  { x: -99, y: -215, delay: 0.03, duration: 1.74, size: 8, fill: "ink" },
  { x: -23, y: 165, delay: 0.12, duration: 1.25, size: 12, fill: "tier" },
  { x: -132, y: 239, delay: 0.08, duration: 1.58, size: 16, fill: "action" },
  { x: 297, y: -228, delay: 0.11, duration: 1.44, size: 8, fill: "tier" },
  { x: 54, y: -297, delay: 0.06, duration: 1.23, size: 8, fill: "tier" },
  { x: 42, y: -183, delay: 0.13, duration: 1.34, size: 16, fill: "ink" },
  { x: 261, y: -4, delay: 0.11, duration: 1.66, size: 8, fill: "tier" },
  { x: 204, y: -163, delay: 0.1, duration: 1.22, size: 8, fill: "action" },
  { x: -167, y: 256, delay: 0.02, duration: 1.74, size: 8, fill: "tier" },
  { x: -111, y: 256, delay: 0.05, duration: 1.31, size: 8, fill: "tier" },
  { x: 160, y: 104, delay: 0.12, duration: 1.59, size: 8, fill: "ink" },
];
