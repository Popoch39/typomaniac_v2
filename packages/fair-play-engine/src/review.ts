import type { GameSignals } from "./signals.ts";
import { playerSuspicion } from "./suspicion.ts";

// Starting values (ADR 0014), to be tuned on real Games. The threshold decides the administrator's
// load: it starts high and comes down as real Games show what honest typing looks like.
/** REVIEW-1: the Suspicion past which a Player is brought to a Review. */
export const SUSPICION_THRESHOLD = 0.6;
/** REVIEW-2: how many Positions, counted from the first, make the Podium. */
export const PODIUM_POSITIONS = 3;

/** Why a Review was opened. */
export type ReviewReason = "suspicion" | "master" | "podium";

/** What decides whether a Player is brought to a Review. */
export type ReviewCandidate = {
  /** Whether a Review of theirs is open, not settled yet. */
  readonly underReview: boolean;
  /** The reason of every Review opened for them before, settled or not. */
  readonly reasonsOpenedBefore: readonly ReviewReason[];
  /** Whether their Rank is Master. */
  readonly master: boolean;
  /** Their Position on the Leaderboard, null while they are not listed. */
  readonly position: number | null;
  /** The signals of their ranked Games played after their last settled Review, newest first. */
  readonly gamesSinceLastReview: readonly GameSignals[];
};

/**
 * REVIEW-1 to REVIEW-4: the reason to open a Review for a Player, or null when none is due. Reaching
 * Master, then the Podium, opens one once each; Suspicion past the threshold, read from the Games
 * played since the last settled Review only, opens one each time; never while one is open.
 */
export const reviewToOpen = ({
  underReview,
  reasonsOpenedBefore,
  master,
  position,
  gamesSinceLastReview,
}: ReviewCandidate): ReviewReason | null => {
  if (underReview) return null;
  if (master && !reasonsOpenedBefore.includes("master")) return "master";
  const onPodium = position !== null && position <= PODIUM_POSITIONS;
  if (onPodium && !reasonsOpenedBefore.includes("podium")) return "podium";
  if (playerSuspicion(gamesSinceLastReview) > SUSPICION_THRESHOLD) return "suspicion";
  return null;
};
