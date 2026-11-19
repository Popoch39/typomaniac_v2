import type { Ornament } from "@repo/ranked-engine";
import { divisionNumeral } from "../../ranked/standing/rankName.ts";
import { chipArt, fullArt, type OrnamentLayer } from "./ornamentArt.ts";

/** `full` for large sizes, `chip` for small ones, where the details would blur. */
export type OrnamentDetail = "full" | "chip";

/** What an SVG draws for a worn Ornament. */
export type OrnamentDrawing = {
  /** The utility that sets the Tier colour the layers read, `null` for the Unranked plate. */
  readonly tierClassName: string | null;
  readonly layers: readonly OrnamentLayer[];
  /** Written on the nameplate, only in full detail and for a Division. */
  readonly numeral: { readonly text: string; readonly className: string } | null;
};

const TIER_CLASS_NAMES = {
  bronze: "ornament-bronze",
  silver: "ornament-silver",
  gold: "ornament-gold",
  platinum: "ornament-platinum",
  diamond: "ornament-diamond",
  master: "ornament-master",
} as const;

export function ornamentDrawing(
  { tier, division }: NonNullable<Ornament>,
  detail: OrnamentDetail,
): OrnamentDrawing {
  if (tier === "unranked")
    return { tierClassName: null, layers: art(detail).unranked, numeral: null };
  const tierClassName = TIER_CLASS_NAMES[tier];
  if (tier === "master") return { tierClassName, layers: art(detail).master, numeral: null };

  // Division IV lights one pip, Division I all four; a pinned Tier lights none.
  const litPips = division === null ? 0 : 5 - division;
  if (detail === "chip") {
    const { frame, litPips: pips } = chipArt[tier];
    return { tierClassName, layers: [...frame, ...pips.slice(0, litPips)], numeral: null };
  }
  const { frame, neutralPlate, litPlate, pips } = fullArt[tier];
  return {
    tierClassName,
    layers: [
      ...frame,
      ...(division === 1 ? litPlate : neutralPlate),
      ...pips.flatMap((pip, index) => (index < litPips ? pip.lit : pip.unlit)),
    ],
    numeral:
      division === null
        ? null
        : {
            text: divisionNumeral(division),
            className: division === 1 ? "ornament-on-key" : "ornament-ink",
          },
  };
}

const art = (detail: OrnamentDetail) => (detail === "full" ? fullArt : chipArt);
