import type { Burst } from "./silverBursts.ts";

/** When the rings and the burst of the Gold scene go off, in seconds. */
export const GOLD_BURST_AT = 1.05;

/** The two rings of the Gold scene, after the burst starts, in seconds. */
export const GOLD_RINGS: readonly number[] = [0, 0.14];

/** The twenty-two particles of the Gold burst, as placed on the canvas. */
export const GOLD_BURSTS: readonly Burst[] = [
  { x: 7, y: 132, delay: 0.07, duration: 1.23, size: 8, fill: "tier" },
  { x: 293, y: 73, delay: 0.1, duration: 1.71, size: 12, fill: "tier" },
  { x: 57, y: -292, delay: 0.12, duration: 1.22, size: 8, fill: "ink" },
  { x: 21, y: -179, delay: 0.13, duration: 1.29, size: 12, fill: "tier" },
  { x: -46, y: -313, delay: 0.12, duration: 1.56, size: 8, fill: "action" },
  { x: 193, y: -54, delay: 0.04, duration: 1.63, size: 16, fill: "tier" },
  { x: -32, y: 156, delay: 0.1, duration: 1.64, size: 16, fill: "tier" },
  { x: 224, y: -130, delay: 0.1, duration: 1.67, size: 12, fill: "ink" },
  { x: -157, y: 157, delay: 0.01, duration: 1.42, size: 8, fill: "tier" },
  { x: 200, y: 166, delay: 0.12, duration: 1.38, size: 12, fill: "action" },
  { x: -119, y: 63, delay: 0.09, duration: 1.49, size: 8, fill: "tier" },
  { x: -156, y: -236, delay: 0.11, duration: 1.61, size: 8, fill: "tier" },
  { x: -150, y: 51, delay: 0.12, duration: 1.57, size: 8, fill: "ink" },
  { x: 9, y: -211, delay: 0.03, duration: 1.73, size: 8, fill: "tier" },
  { x: -143, y: -154, delay: 0.13, duration: 1.38, size: 8, fill: "action" },
  { x: -140, y: 71, delay: 0.01, duration: 1.28, size: 8, fill: "tier" },
  { x: -132, y: -168, delay: 0.04, duration: 1.56, size: 8, fill: "tier" },
  { x: -163, y: 202, delay: 0.07, duration: 1.48, size: 8, fill: "ink" },
  { x: 320, y: -114, delay: 0.02, duration: 1.8, size: 8, fill: "tier" },
  { x: 189, y: -155, delay: 0.03, duration: 1.76, size: 8, fill: "action" },
  { x: 0, y: -191, delay: 0.03, duration: 1.72, size: 12, fill: "tier" },
  { x: 175, y: -35, delay: 0.13, duration: 1.4, size: 12, fill: "tier" },
];
