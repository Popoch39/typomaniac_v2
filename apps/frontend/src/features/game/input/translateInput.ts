import type { GameEvent } from "@repo/typing-engine";

/** What the browser reports in a `beforeinput` event, as plain data so the mapping needs no DOM. */
export type BrowserInput = {
  readonly inputType: string;
  readonly data: string | null;
};

/** The Event a browser input stands for at instant `at`, or null when it must not reach the engine. */
export function translateInput(input: BrowserInput, at: number): GameEvent | null {
  if (input.inputType !== "insertText" || input.data === null) return null;
  return { type: "insert", at, text: input.data };
}
