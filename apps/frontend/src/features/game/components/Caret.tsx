import { caretClassName } from "../../../shared/lib/caretClassName.ts";

export function Caret() {
  return <span className={`${caretClassName} bg-primary`} />;
}
