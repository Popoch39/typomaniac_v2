import { type QueuePhase, shownQueuePhase } from "../phase/queuePhase.ts";

/** The view transition type of the Queue panel and the Queue toast morphing into each other. */
export const QUEUE_MORPH = "queue-morph";

const RANKED_PATH = "/ranked";

/** What the router is deciding from as it changes page: the Queue and the two pages. */
export type QueueMorphInput = {
  readonly phase: QueuePhase;
  /** `undefined` on the first load, which comes from no page. */
  readonly fromPath: string | undefined;
  readonly toPath: string;
};

/**
 * The view transition types of a change of page, or `false` for a change that plays none: the Queue
 * panel of the Ranked page and the searching toast are one card to the eye, so a queued Player sees
 * one become the other as they leave or reach the Ranked page. Every other change of page stays
 * immediate.
 */
export function queueMorphTypes({ phase, fromPath, toPath }: QueueMorphInput): string[] | false {
  if (fromPath === undefined) return false;
  if (shownQueuePhase(phase).kind !== "queued") return false;
  return (fromPath === RANKED_PATH) === (toPath === RANKED_PATH) ? false : [QUEUE_MORPH];
}
