import {
  type QueueNoticePhase,
  type QueuePhase,
  isQueueNotice,
  shownQueuePhase,
} from "../phase/queuePhase.ts";

/** What the shell's Queue layer is deciding from: the Queue and the page the Player is on. */
export type QueueLayerInput = {
  readonly phase: QueuePhase;
  /** The Ranked page shows the Queue in its own panel. */
  readonly isOnRankedPage: boolean;
  /** Its ticking time would pull the eyes from the Target words. */
  readonly isPracticeGameRunning: boolean;
};

/**
 * What the Queue layer shows over the shell: nothing, the searching toast of a queued Player, the
 * Pairing prompt, the toast of a Player entering the Queue again, or the notice telling why they are
 * not queued.
 */
export type QueueLayerContent =
  | { readonly kind: "none" }
  /** Dimmed while a Practice Game runs, back at full strength when it is ready or finished. */
  | { readonly kind: "searching"; readonly isDimmed: boolean }
  | { readonly kind: "pairing" }
  | { readonly kind: "entering" }
  | { readonly kind: "notice"; readonly notice: QueueNoticePhase };

const NONE: QueueLayerContent = { kind: "none" };

/**
 * What the Queue layer shows: the Queue follows the Player off the Ranked page, where the panel no
 * longer shows it. A reconnect keeps showing the Queue or the Pairing it holds.
 */
export function queueLayerContent({
  phase,
  isOnRankedPage,
  isPracticeGameRunning,
}: QueueLayerInput): QueueLayerContent {
  if (isOnRankedPage) return NONE;
  const shown = shownQueuePhase(phase);
  if (shown.kind === "queued") return { kind: "searching", isDimmed: isPracticeGameRunning };
  if (shown.kind === "proposed") return { kind: "pairing" };
  // Entering again from the toast keeps it in place until the Queue answers.
  if (shown.kind === "connecting") return { kind: "entering" };
  if (isQueueNotice(shown)) return { kind: "notice", notice: shown };
  return NONE;
}
