import type { BrowserKey } from "./translateKey.ts";

/** Whether a key restarts the Game; such a key must never reach the engine. */
export function isRestartKey(key: Pick<BrowserKey, "code">): boolean {
  return key.code === "Tab";
}
