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
