import { OWN_ROW_ID } from "../own/ownRowId.ts";

/** Brings the reader's own row into view on the page already shown, and moves focus onto it. */
export function useShowMyRow() {
  const showMyRow = () => {
    const row = document.getElementById(OWN_ROW_ID);
    if (row === null) return;
    const isMotionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "center", behavior: isMotionReduced ? "auto" : "smooth" });
    row.focus({ preventScroll: true });
  };
  return { showMyRow };
}
