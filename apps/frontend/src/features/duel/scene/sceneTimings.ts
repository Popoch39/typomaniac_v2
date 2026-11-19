import type { PromotedTier } from "../rank/tierPromotion.ts";

/** When, in seconds from the opening of the scene, each part of a Tier's entrance starts. */
export type SceneTimings = {
  readonly titleAt: number;
  /** Between the drops of two letters of a title spelled in keys. */
  readonly letterStep: number;
  readonly lineAt: number;
  /** Once the entrance has played: a key still held from the Game cannot skip it. */
  readonly continueAt: number;
  /** The screen shake when the new Ornament lands, none for Silver. */
  readonly shake: { readonly at: number; readonly duration: number } | null;
};

// From the canvas board of each Tier; Master shares Silver's until its own effects land.
const SILVER: SceneTimings = {
  titleAt: 1.45,
  letterStep: 0.1,
  lineAt: 1.55,
  continueAt: 2.4,
  shake: null,
};

const GOLD: SceneTimings = {
  titleAt: 1.4,
  letterStep: 0.1,
  lineAt: 1.95,
  continueAt: 2.8,
  shake: { at: 1.05, duration: 0.38 },
};

const PLATINUM: SceneTimings = {
  titleAt: 1.6,
  letterStep: 0.07,
  lineAt: 2.3,
  continueAt: 3.15,
  shake: { at: 1.32, duration: 0.45 },
};

const DIAMOND: SceneTimings = {
  titleAt: 1.9,
  letterStep: 0.07,
  lineAt: 2.5,
  continueAt: 3.35,
  shake: { at: 1.35, duration: 0.5 },
};

export const SCENE_TIMINGS: Readonly<Record<PromotedTier, SceneTimings>> = {
  silver: SILVER,
  gold: GOLD,
  platinum: PLATINUM,
  diamond: DIAMOND,
  master: SILVER,
};
