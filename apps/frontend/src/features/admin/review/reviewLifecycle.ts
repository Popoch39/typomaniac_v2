import type { ReviewEnding } from "./reviewEnding.ts";

/** Where a Review stands: open to its endings, or settled with the one decided. */
export type ReviewLifecycle =
  | { readonly kind: "open" }
  | { readonly kind: "settled"; readonly decision: ReviewEnding; readonly settledAt: number };

/**
 * The lifecycle of a Review as the server read it. The server owns it: settling refetches the read
 * rather than moving the Review on the client.
 */
export function reviewLifecycleOf(
  settlement: { readonly decision: ReviewEnding; readonly settledAt: number } | null,
): ReviewLifecycle {
  return settlement === null ? { kind: "open" } : { kind: "settled", ...settlement };
}
