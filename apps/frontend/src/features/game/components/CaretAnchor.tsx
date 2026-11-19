import { caretClassName } from "../../../shared/lib/caretClassName.ts";
import { followCaret } from "../caret/followCaret.ts";

/** Marks in the text where the Participant's caret belongs; the caret itself glides there over the word list. */
export function CaretAnchor() {
  return <span ref={followCaret} data-caret-anchor className={caretClassName} />;
}
