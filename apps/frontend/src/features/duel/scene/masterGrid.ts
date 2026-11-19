import { MASTER_BURST_AT } from "./masterBursts.ts";
import { blinkingGrid } from "./platinumGrid.ts";

/** The grid of the Master scene, the Platinum one blinking out as the new Ornament lands. */
export const MASTER_GRID = blinkingGrid(MASTER_BURST_AT);
