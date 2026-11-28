/**
 * How long the Pairing prompt is on screen before Enter accepts it: long enough that an Enter typed
 * into the Practice Game an instant before it opened does not accept for the Player.
 */
export const PAIRING_ACCEPT_GUARD_MS = 400;

/** The key pressed while the Pairing prompt is open, as the browser reports it. */
export type PromptKey = {
  readonly key: string;
  /** Sent by a key held down, which the Player did not press for this prompt. */
  readonly repeat: boolean;
};

/**
 * Whether a key accepts the Pairing, `elapsedMs` after its prompt was shown. Only Enter does, once
 * the guard delay is over: a letter or the Separator typed mid-word never accepts.
 */
export function acceptsPairing({ key, repeat }: PromptKey, elapsedMs: number): boolean {
  return key === "Enter" && !repeat && elapsedMs >= PAIRING_ACCEPT_GUARD_MS;
}
