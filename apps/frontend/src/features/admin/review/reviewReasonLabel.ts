export type ReviewReason = "suspicion" | "master" | "podium";

const LABELS: Readonly<Record<ReviewReason, string>> = {
  suspicion: "Suspicion past the threshold",
  master: "Reached Master",
  podium: "Reached the Podium",
};

/** Why a Review was opened, as the administration page says it. */
export function reviewReasonLabel(reason: ReviewReason) {
  return LABELS[reason];
}
