/** What fills a burst particle: the Tier colour, the ink or the action colour. */
export type BurstFill = "tier" | "ink" | "action";

export type Burst = {
  /** Where the particle flies to from the centre of the Ornament, in px. */
  readonly x: number;
  readonly y: number;
  /** After the burst starts, in seconds. */
  readonly delay: number;
  readonly duration: number;
  readonly size: number;
  readonly fill: BurstFill;
};

/** When the ring and the burst of the Silver scene go off, in seconds. */
export const SILVER_BURST_AT = 1.35;

/** The fourteen particles of the Silver burst, as placed on the canvas. */
export const SILVER_BURSTS: readonly Burst[] = [
  { x: 12, y: 113, delay: 0.01, duration: 1.63, size: 12, fill: "tier" },
  { x: 93, y: -147, delay: 0.01, duration: 1.33, size: 12, fill: "tier" },
  { x: 45, y: -188, delay: 0.05, duration: 1.51, size: 12, fill: "ink" },
  { x: -131, y: -170, delay: 0.09, duration: 1.44, size: 16, fill: "tier" },
  { x: 182, y: 109, delay: 0.01, duration: 1.38, size: 12, fill: "action" },
  { x: 167, y: 94, delay: 0.05, duration: 1.75, size: 8, fill: "tier" },
  { x: 90, y: -234, delay: 0.01, duration: 1.42, size: 8, fill: "tier" },
  { x: 25, y: -162, delay: 0.12, duration: 1.31, size: 12, fill: "ink" },
  { x: -57, y: 180, delay: 0.13, duration: 1.64, size: 12, fill: "tier" },
  { x: 124, y: 105, delay: 0.08, duration: 1.45, size: 16, fill: "action" },
  { x: -6, y: 154, delay: 0.01, duration: 1.66, size: 16, fill: "tier" },
  { x: 101, y: 54, delay: 0.06, duration: 1.55, size: 12, fill: "tier" },
  { x: -55, y: 195, delay: 0.02, duration: 1.22, size: 8, fill: "ink" },
  { x: -191, y: -55, delay: 0.1, duration: 1.51, size: 12, fill: "tier" },
];
