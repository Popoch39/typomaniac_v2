import { usePairingKeys } from "./usePairingKeys.ts";

// The prompt takes the focus as it shows, so that Enter reaches it without a click first. Stable,
// so that a re-render never hands the focus back to it.
const focusPrompt = (node: HTMLElement | null) => node?.focus({ preventScroll: true });

export function usePairingPanel() {
  return { focusPrompt, ...usePairingKeys() };
}
