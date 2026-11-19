import type { PromotedTier } from "../rank/tierPromotion.ts";
import type { GridSquare } from "./blinkingGrid.ts";
import type { Tile } from "./cutIntoTiles.ts";
import {
  DIAMOND_BURST_AT,
  DIAMOND_BURSTS,
  DIAMOND_INWARD_RINGS,
  DIAMOND_RINGS,
} from "./diamondBursts.ts";
import { DIAMOND_RAIN, type Drop } from "./diamondRain.ts";
import { DIAMOND_ASSEMBLE_AT, DIAMOND_SHATTER_AT, DIAMOND_TILES } from "./diamondTiles.ts";
import { GOLD_BURST_AT, GOLD_BURSTS, GOLD_RINGS } from "./goldBursts.ts";
import {
  MASTER_BURST_AT,
  MASTER_BURSTS,
  MASTER_INWARD_RINGS,
  MASTER_RINGS,
} from "./masterBursts.ts";
import { MASTER_GRID } from "./masterGrid.ts";
import { MASTER_RAIN, MASTER_STARS, type Star } from "./masterRain.ts";
import { MASTER_RAYS, MASTER_RAYS_SPIN } from "./masterRays.ts";
import { MASTER_ASSEMBLE_AT, MASTER_SHATTER_AT, MASTER_TILES } from "./masterTiles.ts";
import { PLATINUM_BURST_AT, PLATINUM_BURSTS, PLATINUM_RINGS } from "./platinumBursts.ts";
import { PLATINUM_GRID } from "./platinumGrid.ts";
import { PLATINUM_RAYS, PLATINUM_RAYS_SPIN, type Ray } from "./platinumRays.ts";
import { type Burst, SILVER_BURST_AT, SILVER_BURSTS } from "./silverBursts.ts";

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

/** How each Ornament leaves and lands: an outer motion, and an inner one that runs alongside it. */
export type HeroMotion = {
  readonly old: string;
  readonly oldInner: string;
  readonly new: string;
  readonly newInner: string;
};

/** The old Ornament shattering into tiles and the new one assembling from them. */
export type Tiling = {
  readonly tiles: readonly Tile[];
  readonly shatterAt: number;
  readonly assembleAt: number;
};

export type TierEffects = {
  /** When the rings and the burst go off, in seconds. */
  readonly at: number;
  /** Each ring, after `at`, in seconds. */
  readonly rings: readonly number[];
  readonly bursts: readonly Burst[];
  /** Whether the burst flies over the Ornament rather than behind it. */
  readonly isBurstOverHero: boolean;
  /** Rays that fade in at `at` and turn once every `spin` seconds; the faint ones in `faintFill`. */
  readonly rays?: {
    readonly spin: number;
    readonly rays: readonly Ray[];
    readonly faintFill?: "tier" | "action";
  };
  readonly grid?: readonly GridSquare[];
  /** Rings closing on the old Ornament, each from the opening, in seconds. */
  readonly inwardRings?: readonly number[];
  readonly rain?: readonly Drop[];
  readonly stars?: readonly Star[];
};

/** Everything that sets one Tier's scene apart; its keyframes live in `index.css`. */
export type TierScene = {
  /** Sets `--rank-up-tier`, the colour of the Tier the effects take. */
  readonly colourClassName: string;
  readonly timings: SceneTimings;
  readonly hero: HeroMotion;
  /** Diamond and Master shatter the old Ornament and assemble the new one from tiles. */
  readonly tiling: Tiling | null;
  /** Silver wipes the new Ornament in under a scan line. */
  readonly hasScan: boolean;
  /** Master spells its name in keys down both sides of the Ornament. */
  readonly hasSideKeys: boolean;
  readonly effects: TierEffects;
};

// The timings, the motions and the effects come from the canvas board of each Tier, except
// `continueAt`: the canvas has no Continue, so it is chosen, 0.85s after the line.
const SILVER: TierScene = {
  colourClassName: "[--rank-up-tier:var(--tier-silver)]",
  timings: { titleAt: 1.45, letterStep: 0.1, lineAt: 1.55, continueAt: 2.4, shake: null },
  hero: { old: "rank-up-silver-old", oldInner: "", new: "rank-up-wipe", newInner: "" },
  tiling: null,
  hasScan: true,
  hasSideKeys: false,
  effects: { at: SILVER_BURST_AT, rings: [0], bursts: SILVER_BURSTS, isBurstOverHero: false },
};

const GOLD: TierScene = {
  colourClassName: "[--rank-up-tier:var(--tier-gold)]",
  timings: {
    titleAt: 1.4,
    letterStep: 0.1,
    lineAt: 1.95,
    continueAt: 2.8,
    shake: { at: 1.05, duration: 0.38 },
  },
  hero: {
    old: "rank-up-gold-old",
    oldInner: "rank-up-jitter",
    new: "rank-up-flip-in",
    newInner: "rank-up-float",
  },
  tiling: null,
  hasScan: false,
  hasSideKeys: false,
  effects: { at: GOLD_BURST_AT, rings: GOLD_RINGS, bursts: GOLD_BURSTS, isBurstOverHero: false },
};

const PLATINUM: TierScene = {
  colourClassName: "[--rank-up-tier:var(--tier-platinum)]",
  timings: {
    titleAt: 1.6,
    letterStep: 0.07,
    lineAt: 2.3,
    continueAt: 3.15,
    shake: { at: 1.32, duration: 0.45 },
  },
  hero: {
    old: "rank-up-platinum-old",
    oldInner: "rank-up-platinum-jitter",
    new: "rank-up-slam",
    newInner: "rank-up-float [--rank-up-float-at:2.6s]",
  },
  tiling: null,
  hasScan: false,
  hasSideKeys: false,
  effects: {
    at: PLATINUM_BURST_AT,
    rings: PLATINUM_RINGS,
    bursts: PLATINUM_BURSTS,
    isBurstOverHero: true,
    rays: { spin: PLATINUM_RAYS_SPIN, rays: PLATINUM_RAYS },
    grid: PLATINUM_GRID,
  },
};

// The tiles do the motion, for Diamond and Master; the whole Ornaments only hold until the old
// shatters and the new is assembled.
const DIAMOND: TierScene = {
  colourClassName: "[--rank-up-tier:var(--tier-diamond)]",
  timings: {
    titleAt: 1.9,
    letterStep: 0.07,
    lineAt: 2.5,
    continueAt: 3.35,
    shake: { at: 1.35, duration: 0.5 },
  },
  hero: {
    old: "rank-up-diamond-old",
    oldInner: "rank-up-diamond-jitter",
    new: "rank-up-diamond-new",
    newInner: "rank-up-float [--rank-up-float-at:2.7s]",
  },
  tiling: {
    tiles: DIAMOND_TILES,
    shatterAt: DIAMOND_SHATTER_AT,
    assembleAt: DIAMOND_ASSEMBLE_AT,
  },
  hasScan: false,
  hasSideKeys: false,
  // The same rays as Platinum's, as on the canvas.
  effects: {
    at: DIAMOND_BURST_AT,
    rings: DIAMOND_RINGS,
    bursts: DIAMOND_BURSTS,
    isBurstOverHero: true,
    rays: { spin: PLATINUM_RAYS_SPIN, rays: PLATINUM_RAYS },
    inwardRings: DIAMOND_INWARD_RINGS,
    rain: DIAMOND_RAIN,
  },
};

const MASTER: TierScene = {
  colourClassName: "[--rank-up-tier:var(--tier-master)]",
  timings: {
    titleAt: 2,
    letterStep: 0.08,
    lineAt: 2.7,
    continueAt: 3.55,
    shake: { at: 1.45, duration: 0.6 },
  },
  hero: {
    old: "rank-up-master-old",
    oldInner: "rank-up-master-jitter",
    new: "rank-up-master-new",
    newInner: "rank-up-float [--rank-up-float-at:2.9s]",
  },
  tiling: {
    tiles: MASTER_TILES,
    shatterAt: MASTER_SHATTER_AT,
    assembleAt: MASTER_ASSEMBLE_AT,
  },
  hasScan: false,
  hasSideKeys: true,
  effects: {
    at: MASTER_BURST_AT,
    rings: MASTER_RINGS,
    bursts: MASTER_BURSTS,
    isBurstOverHero: true,
    rays: { spin: MASTER_RAYS_SPIN, rays: MASTER_RAYS, faintFill: "action" },
    grid: MASTER_GRID,
    inwardRings: MASTER_INWARD_RINGS,
    rain: MASTER_RAIN,
    stars: MASTER_STARS,
  },
};

export const TIER_SCENES: Readonly<Record<PromotedTier, TierScene>> = {
  silver: SILVER,
  gold: GOLD,
  platinum: PLATINUM,
  diamond: DIAMOND,
  master: MASTER,
};
