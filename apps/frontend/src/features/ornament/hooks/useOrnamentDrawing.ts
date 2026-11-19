import type { Ornament } from "@repo/ranked-engine";
import { type OrnamentDetail, ornamentDrawing } from "../art/ornamentDrawing.ts";

export function useOrnamentDrawing(ornament: NonNullable<Ornament>, detail: OrnamentDetail) {
  return ornamentDrawing(ornament, detail);
}
