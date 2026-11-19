import { OWN_ROW_ID } from "./ownRowId.ts";

/** What marks the reader's own row or Podium step, so that Show my row can find and focus it. */
export function ownRowAttributes(isOwn: boolean) {
  return isOwn ? ({ id: OWN_ROW_ID, tabIndex: -1, "aria-current": "true" } as const) : {};
}
