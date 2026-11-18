import { SEPARATOR } from "@repo/typing-engine";

/** A Target word or an input without its trailing Separator, if it has one. */
export function withoutSeparator(text: string) {
  return text.endsWith(SEPARATOR) ? text.slice(0, -SEPARATOR.length) : text;
}
