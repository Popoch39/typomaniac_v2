import type { GameEvent } from "@repo/typing-engine";

/** What the browser reports in a `beforeinput` event, as plain data so the mapping needs no DOM. */
export type BrowserInput = {
  readonly inputType: string;
  readonly data: string | null;
};

/** The Event a browser input stands for at instant `at`, or null when it must not reach the engine. */
export function translateInput(input: BrowserInput, at: number): GameEvent | null {
  // Paste, drop and composition fall through: a Result must only come from direct typing.
  switch (input.inputType) {
    case "insertText":
      return input.data === null ? null : { type: "insert", at, text: input.data };
    case "deleteContentBackward":
      return { type: "delete", at, unit: "char" };
    case "deleteWordBackward":
      return { type: "delete", at, unit: "word" };
    default:
      return null;
  }
}

// The keys Monkeytype tracks: those that write something, so Key consistency reflects real typing.
const trackedCodes: ReadonlySet<string> = new Set([
  "Backquote",
  "Minus",
  "Equal",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  "IntlBackslash",
  "Semicolon",
  "Quote",
  "Comma",
  "Period",
  "Slash",
  "Space",
  "Enter",
  "Tab",
  "NumpadDecimal",
  "NumpadAdd",
  "NumpadSubtract",
  "NumpadMultiply",
  "NumpadDivide",
  "NumpadEnter",
]);
const trackedCodePattern = /^(Key[A-Z]|Digit[0-9]|Numpad[0-9])$/;

/** What the browser reports in a `keydown` or `keyup` event, as plain data so the mapping needs no DOM. */
export type BrowserKey = {
  readonly type: "keydown" | "keyup";
  readonly code: string;
  readonly repeat: boolean;
};

/** The KeyPress Event a browser key event stands for at instant `at`, or null when it must not reach the engine. */
export function translateKey(key: BrowserKey, at: number): GameEvent | null {
  // The engine records every key press it receives and leaves this filter to the emitter (RULES.md, "Known deviations on keys").
  if (key.repeat) return null;
  if (!trackedCodes.has(key.code) && !trackedCodePattern.test(key.code)) return null;
  return { type: key.type === "keydown" ? "keyDown" : "keyUp", at, code: key.code };
}
