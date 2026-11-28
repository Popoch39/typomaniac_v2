import { type QueuePhase, shownQueuePhase } from "../phase/queuePhase.ts";

/** What the shell's Queue layer is deciding from: the Queue and the page the Player is on. */
export type QueueLayerInput = {
  readonly phase: QueuePhase;
  /** The Ranked page shows the Queue in its own panel. */
  readonly isOnRankedPage: boolean;
};

/**
 * What the Queue layer shows over the shell: nothing, the searching toast of a queued Player, or
 * the Pairing prompt.
 */
export type QueueLayerContent =
  | { readonly kind: "none" }
  | { readonly kind: "searching" }
  | { readonly kind: "pairing" };

const NONE: QueueLayerContent = { kind: "none" };

/**
 * What the Queue layer shows: the Queue follows the Player off the Ranked page, where the panel no
 * longer shows it. A reconnect keeps showing the Queue or the Pairing it holds.
 */
export function queueLayerContent({ phase, isOnRankedPage }: QueueLayerInput): QueueLayerContent {
  if (isOnRankedPage) return NONE;
  const shown = shownQueuePhase(phase);
  if (shown.kind === "queued") return { kind: "searching" };
  if (shown.kind === "proposed") return { kind: "pairing" };
  return NONE;
}
