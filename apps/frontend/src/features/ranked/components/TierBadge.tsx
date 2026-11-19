import type { Tier } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";

const SHIELD =
  "M10 1H22V3H26V5H28V9H30V19H28V23H25V26H21V29H18V31H14V29H11V26H7V23H4V19H2V9H4V5H6V3H10Z";
const INSET = "M12 5H20V7H23V10H25V18H23V21H20V24H17V26H15V24H12V21H9V18H7V10H9V7H12Z";
const GEM = "M15 9H17V11H19V13H21V15H19V17H17V19H15V17H13V15H11V13H13V11H15Z";
const QUESTION_MARK = "M13 9H19V11H21V15H19V17H17V19H15V16H17V14H19V11H13V13H11V11H13Z";

const TIER_FILLS: Readonly<Record<Tier | "unranked", string>> = {
  bronze: "fill-tier-bronze",
  silver: "fill-tier-silver",
  gold: "fill-tier-gold",
  platinum: "fill-tier-platinum",
  diamond: "fill-tier-diamond",
  master: "fill-tier-master",
  unranked: "fill-key-face",
};

interface TierBadgeProps {
  /** `unranked` draws the hidden Rank: the shield in the key face, with a question mark. */
  tier: Tier | "unranked";
  /** `sm` for the Tier ladder, `lg` for the Rank card. The small one drops the details that blur. */
  size: "sm" | "lg";
}

/** A Tier's pixel emblem, decorative: the Tier's name is always printed beside it. */
export function TierBadge({ tier, size }: TierBadgeProps) {
  const fill = TIER_FILLS[tier];
  const isLarge = size === "lg";

  return (
    <svg
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn("block shrink-0", isLarge ? "size-32" : "size-14")}
    >
      <path d={SHIELD} strokeWidth={1} className={cn(fill, "stroke-key-outline")} />
      {tier === "unranked" ? (
        <>
          <path d={INSET} fillOpacity={0.35} className="fill-key-outline" />
          <path d={QUESTION_MARK} className="fill-brand" />
          <path d="M15 21H17V23H15Z" className="fill-brand" />
        </>
      ) : (
        <>
          <path d={INSET} fillOpacity={0.28} className="fill-key-outline" />
          <path d="M10 3H22V5H10Z" fillOpacity={0.5} className="fill-white" />
          {isLarge && <path d="M4 9H6V17H4Z" fillOpacity={0.3} className="fill-white" />}
          <path d={GEM} className="fill-ink" />
          {isLarge && <path d="M15 11H17V13H15Z" className={fill} />}
        </>
      )}
    </svg>
  );
}
