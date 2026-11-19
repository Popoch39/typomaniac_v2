import type { PromotedTier } from "../rank/tierPromotion.ts";

/** When, in seconds from the opening of the scene, each part of a Tier's entrance starts. */
export type SceneTimings = {
  readonly titleAt: number;
  readonly lineAt: number;
  /** Once the entrance has played: a key still held from the Game cannot skip it. */
  readonly continueAt: number;
};

// From the canvas board of each Tier; the louder Tiers share Silver's until their own effects land.
const SILVER: SceneTimings = { titleAt: 1.45, lineAt: 1.55, continueAt: 2.4 };

export const SCENE_TIMINGS: Readonly<Record<PromotedTier, SceneTimings>> = {
  silver: SILVER,
  gold: SILVER,
  platinum: SILVER,
  diamond: SILVER,
  master: SILVER,
};
