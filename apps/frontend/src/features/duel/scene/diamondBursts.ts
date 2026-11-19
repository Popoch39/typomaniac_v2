import type { Burst } from "./silverBursts.ts";

/** When the rings, the burst, the rays and the shake of the Diamond scene go off, in seconds. */
export const DIAMOND_BURST_AT = 1.35;

/** The three rings of the Diamond scene, after the burst starts, in seconds. */
export const DIAMOND_RINGS: readonly number[] = [0, 0.12, 0.24];

/** The three rings closing on the old Ornament before it shatters, from the opening, in seconds. */
export const DIAMOND_INWARD_RINGS: readonly number[] = [0.2, 0.45, 0.7];

/** The forty particles of the Diamond burst, as placed on the canvas. */
export const DIAMOND_BURSTS: readonly Burst[] = [
  { x: -5, y: 169, delay: 0.04, duration: 1.63, size: 8, fill: "tier" },
  { x: -270, y: -69, delay: 0.12, duration: 1.27, size: 8, fill: "tier" },
  { x: 29, y: -392, delay: 0.11, duration: 1.23, size: 16, fill: "ink" },
  { x: 311, y: -4, delay: 0.07, duration: 1.6, size: 8, fill: "tier" },
  { x: 248, y: -129, delay: 0.06, duration: 1.31, size: 8, fill: "action" },
  { x: -80, y: -260, delay: 0.01, duration: 1.38, size: 12, fill: "tier" },
  { x: 140, y: 289, delay: 0.01, duration: 1.49, size: 12, fill: "tier" },
  { x: 40, y: 173, delay: 0.07, duration: 1.21, size: 12, fill: "ink" },
  { x: -239, y: 15, delay: 0.04, duration: 1.59, size: 12, fill: "tier" },
  { x: 246, y: 158, delay: 0.06, duration: 1.26, size: 8, fill: "action" },
  { x: -386, y: -265, delay: 0.12, duration: 1.75, size: 8, fill: "tier" },
  { x: -124, y: -383, delay: 0.07, duration: 1.72, size: 12, fill: "tier" },
  { x: -211, y: -221, delay: 0.04, duration: 1.65, size: 8, fill: "ink" },
  { x: 19, y: 166, delay: 0.04, duration: 1.59, size: 8, fill: "tier" },
  { x: -335, y: 15, delay: 0.08, duration: 1.28, size: 8, fill: "action" },
  { x: 148, y: -255, delay: 0.03, duration: 1.41, size: 8, fill: "tier" },
  { x: -392, y: 171, delay: 0.01, duration: 1.31, size: 8, fill: "tier" },
  { x: 365, y: 26, delay: 0.12, duration: 1.4, size: 8, fill: "ink" },
  { x: -386, y: -193, delay: 0.09, duration: 1.31, size: 16, fill: "tier" },
  { x: -49, y: -237, delay: 0.12, duration: 1.4, size: 8, fill: "action" },
  { x: 329, y: 21, delay: 0.05, duration: 1.76, size: 12, fill: "tier" },
  { x: -223, y: -94, delay: 0.12, duration: 1.67, size: 12, fill: "tier" },
  { x: -56, y: -366, delay: 0.12, duration: 1.47, size: 16, fill: "ink" },
  { x: 158, y: 246, delay: 0.14, duration: 1.78, size: 12, fill: "tier" },
  { x: -126, y: 207, delay: 0.14, duration: 1.36, size: 8, fill: "action" },
  { x: -387, y: -72, delay: 0.1, duration: 1.28, size: 8, fill: "tier" },
  { x: 304, y: -52, delay: 0, duration: 1.77, size: 8, fill: "tier" },
  { x: -388, y: 42, delay: 0.09, duration: 1.63, size: 12, fill: "ink" },
  { x: 209, y: 249, delay: 0.12, duration: 1.27, size: 16, fill: "tier" },
  { x: 34, y: -215, delay: 0, duration: 1.55, size: 12, fill: "action" },
  { x: -27, y: 166, delay: 0.11, duration: 1.33, size: 16, fill: "tier" },
  { x: -147, y: 141, delay: 0.12, duration: 1.79, size: 8, fill: "tier" },
  { x: -3, y: 171, delay: 0.12, duration: 1.62, size: 16, fill: "ink" },
  { x: 330, y: 76, delay: 0.03, duration: 1.8, size: 12, fill: "tier" },
  { x: -382, y: -14, delay: 0.07, duration: 1.26, size: 8, fill: "action" },
  { x: -171, y: -229, delay: 0.02, duration: 1.35, size: 12, fill: "tier" },
  { x: -88, y: 190, delay: 0.1, duration: 1.49, size: 8, fill: "tier" },
  { x: -136, y: 106, delay: 0.08, duration: 1.8, size: 12, fill: "ink" },
  { x: 208, y: -238, delay: 0.1, duration: 1.42, size: 12, fill: "tier" },
  { x: 195, y: 116, delay: 0.04, duration: 1.45, size: 12, fill: "action" },
];
