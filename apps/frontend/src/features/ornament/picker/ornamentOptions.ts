import {
  isOrnamentUnlocked,
  type Ornament,
  type OrnamentChoice,
  type Rank,
  type Tier,
  wornOrnament,
} from "@repo/ranked-engine";
import { tierName } from "../../ranked/standing/rankName.ts";

/** One choice of the Ornament picker. */
export type OrnamentOption = {
  readonly choice: OrnamentChoice;
  readonly label: string;
  /** What the Player would wear with this choice, around their own Avatar. */
  readonly preview: Ornament;
  /** Why the choice cannot be picked yet, `null` when it can. */
  readonly lockedHint: string | null;
};

const TIERS: readonly Tier[] = ["bronze", "silver", "gold", "platinum", "diamond", "master"];

const CHOICES: readonly OrnamentChoice[] = ["auto", "none", "unranked", ...TIERS];

const LABELS = { auto: "Auto", none: "None", unranked: "Unranked" } as const;

const labelOf = (choice: OrnamentChoice) =>
  choice === "auto" || choice === "none" || choice === "unranked"
    ? LABELS[choice]
    : tierName(choice);

/** Every Ornament a Player may choose from, the Tiers above their Peak Tier locked. */
export function ornamentOptions(peakTier: Tier | null, rank: Rank | null): OrnamentOption[] {
  return CHOICES.map((choice) => ({
    choice,
    label: labelOf(choice),
    preview: wornOrnament(choice, rank),
    lockedHint: isOrnamentUnlocked(choice, peakTier) ? null : `Reach ${labelOf(choice)} to unlock`,
  }));
}
