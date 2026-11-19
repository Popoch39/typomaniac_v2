import type { Burst } from "./silverBursts.ts";

/** When the rings, the burst, the rays, the grid and the shake of the Master scene go off, in seconds. */
export const MASTER_BURST_AT = 1.45;

/** The five rings of the Master scene, after the burst starts, in seconds. */
export const MASTER_RINGS: readonly number[] = [0, 0.1, 0.2, 0.3, 0.4];

/** The four rings closing on the old Ornament before it shatters, from the opening, in seconds. */
export const MASTER_INWARD_RINGS: readonly number[] = [0.2, 0.45, 0.7, 0.95];

/** The sixty particles of the Master burst, as placed on the canvas. */
export const MASTER_BURSTS: readonly Burst[] = [
  { x: -21, y: 184, delay: 0.02, duration: 1.42, size: 8, fill: "tier" },
  { x: 473, y: -110, delay: 0.01, duration: 1.42, size: 8, fill: "tier" },
  { x: -25, y: -468, delay: 0.1, duration: 1.25, size: 8, fill: "ink" },
  { x: -83, y: 346, delay: 0.01, duration: 1.3, size: 12, fill: "tier" },
  { x: 289, y: 227, delay: 0.14, duration: 1.66, size: 12, fill: "action" },
  { x: -343, y: 100, delay: 0.13, duration: 1.73, size: 12, fill: "tier" },
  { x: 197, y: 118, delay: 0.06, duration: 1.33, size: 8, fill: "tier" },
  { x: -231, y: -71, delay: 0.04, duration: 1.34, size: 16, fill: "ink" },
  { x: -438, y: -206, delay: 0.08, duration: 1.77, size: 16, fill: "tier" },
  { x: 231, y: 104, delay: 0.13, duration: 1.73, size: 16, fill: "action" },
  { x: 257, y: -406, delay: 0.01, duration: 1.42, size: 12, fill: "tier" },
  { x: 1, y: -220, delay: 0.03, duration: 1.24, size: 12, fill: "tier" },
  { x: 300, y: -313, delay: 0.1, duration: 1.74, size: 8, fill: "ink" },
  { x: -52, y: -255, delay: 0.04, duration: 1.44, size: 8, fill: "tier" },
  { x: -193, y: 338, delay: 0.03, duration: 1.78, size: 16, fill: "action" },
  { x: -91, y: 296, delay: 0.06, duration: 1.54, size: 12, fill: "tier" },
  { x: 212, y: 278, delay: 0.13, duration: 1.65, size: 12, fill: "tier" },
  { x: -16, y: -299, delay: 0.03, duration: 1.33, size: 12, fill: "ink" },
  { x: 177, y: 322, delay: 0.02, duration: 1.43, size: 8, fill: "tier" },
  { x: -208, y: -83, delay: 0.07, duration: 1.64, size: 8, fill: "action" },
  { x: -231, y: 336, delay: 0.07, duration: 1.8, size: 12, fill: "tier" },
  { x: 243, y: 80, delay: 0.11, duration: 1.34, size: 8, fill: "tier" },
  { x: -194, y: -172, delay: 0.1, duration: 1.74, size: 16, fill: "ink" },
  { x: -312, y: -36, delay: 0.05, duration: 1.42, size: 12, fill: "tier" },
  { x: 320, y: 272, delay: 0.08, duration: 1.63, size: 12, fill: "action" },
  { x: 223, y: -146, delay: 0.13, duration: 1.56, size: 8, fill: "tier" },
  { x: -282, y: 161, delay: 0.03, duration: 1.5, size: 16, fill: "tier" },
  { x: 333, y: 173, delay: 0.03, duration: 1.71, size: 16, fill: "ink" },
  { x: 183, y: -95, delay: 0.09, duration: 1.21, size: 8, fill: "tier" },
  { x: 384, y: -119, delay: 0.04, duration: 1.3, size: 8, fill: "action" },
  { x: -40, y: 287, delay: 0.04, duration: 1.53, size: 8, fill: "tier" },
  { x: 203, y: 194, delay: 0.1, duration: 1.75, size: 12, fill: "tier" },
  { x: 172, y: 291, delay: 0.01, duration: 1.58, size: 12, fill: "ink" },
  { x: 179, y: 3, delay: 0.03, duration: 1.24, size: 8, fill: "tier" },
  { x: 467, y: -144, delay: 0.07, duration: 1.64, size: 8, fill: "action" },
  { x: -175, y: 285, delay: 0.13, duration: 1.34, size: 16, fill: "tier" },
  { x: -417, y: 53, delay: 0.12, duration: 1.42, size: 12, fill: "tier" },
  { x: -331, y: -369, delay: 0.08, duration: 1.74, size: 8, fill: "ink" },
  { x: -276, y: -285, delay: 0.01, duration: 1.69, size: 8, fill: "tier" },
  { x: -247, y: 26, delay: 0.12, duration: 1.34, size: 12, fill: "action" },
  { x: 1, y: 109, delay: 0.02, duration: 1.74, size: 12, fill: "tier" },
  { x: -346, y: -326, delay: 0.08, duration: 1.51, size: 16, fill: "tier" },
  { x: 424, y: 209, delay: 0.01, duration: 1.74, size: 16, fill: "ink" },
  { x: -209, y: 136, delay: 0.08, duration: 1.56, size: 12, fill: "tier" },
  { x: -38, y: 355, delay: 0, duration: 1.22, size: 12, fill: "action" },
  { x: -170, y: -220, delay: 0.05, duration: 1.4, size: 8, fill: "tier" },
  { x: 413, y: -311, delay: 0.02, duration: 1.57, size: 12, fill: "tier" },
  { x: -306, y: -319, delay: 0.05, duration: 1.32, size: 16, fill: "ink" },
  { x: 183, y: 131, delay: 0.02, duration: 1.46, size: 12, fill: "tier" },
  { x: -159, y: -416, delay: 0.06, duration: 1.71, size: 8, fill: "action" },
  { x: 303, y: -254, delay: 0.08, duration: 1.28, size: 8, fill: "tier" },
  { x: 197, y: 50, delay: 0.03, duration: 1.54, size: 16, fill: "tier" },
  { x: 284, y: -325, delay: 0.13, duration: 1.55, size: 12, fill: "ink" },
  { x: 207, y: -314, delay: 0.11, duration: 1.65, size: 8, fill: "tier" },
  { x: -128, y: 357, delay: 0.01, duration: 1.21, size: 12, fill: "action" },
  { x: 114, y: 159, delay: 0.01, duration: 1.8, size: 8, fill: "tier" },
  { x: -12, y: 386, delay: 0.1, duration: 1.41, size: 16, fill: "tier" },
  { x: 151, y: 123, delay: 0.09, duration: 1.64, size: 12, fill: "ink" },
  { x: 300, y: 30, delay: 0.06, duration: 1.33, size: 8, fill: "tier" },
  { x: -310, y: 105, delay: 0.08, duration: 1.21, size: 8, fill: "action" },
];
