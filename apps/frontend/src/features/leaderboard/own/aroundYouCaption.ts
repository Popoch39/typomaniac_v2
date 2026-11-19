import { pagePositions } from "../page/pagePositions.ts";

/** The caption over the reader and their neighbours, with the Positions they hold. */
export function aroundYouCaption(around: readonly { position: number }[]) {
  const positions = pagePositions(around);
  return positions === null ? "Around you" : `Around you · ${positions}`;
}
