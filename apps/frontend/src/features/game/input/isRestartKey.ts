/** What the browser reports in a keyboard event, as plain data so the check needs no DOM. */
export type BrowserKey = {
  readonly code: string;
};

/** Whether a key restarts the Game; such a key must never reach the engine. */
export function isRestartKey(key: BrowserKey): boolean {
  return key.code === "Tab";
}
