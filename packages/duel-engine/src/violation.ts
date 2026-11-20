import type { GameEvent } from "@repo/typing-engine";

/** A Violation the server finds in an `insert` of a ranked Duel (ADR 0016). */
export type ViolationKind = "multipleCharacters" | "noKeyPress";

/**
 * What the server keeps of a Participant's keys to tell whether a KeyPress accounts for each
 * `insert`, rebuilt from the journal by folding `pairKeys` over it.
 */
export type KeyPairing = {
  /** The last key that went down since the previous `insert`, null when none did. */
  readonly pendingCode: string | null;
  /** The key that accounted for the last `insert`, with its character, while it is held. */
  readonly held: { readonly code: string; readonly text: string } | null;
};

export const NO_KEYS_PAIRED: KeyPairing = { pendingCode: null, held: null };

/**
 * VIOLATION-1 to VIOLATION-6: the Violation an Event is, given the pairing of the Events before
 * it, or null. A held key may only repeat its own character, so that holding one key never lets
 * a client send any text it likes.
 */
export function findViolation(pairing: KeyPairing, event: GameEvent): ViolationKind | null {
  if (event.type !== "insert") return null;
  if (event.text.length > 1) return "multipleCharacters";
  if (pairing.pendingCode !== null) return null;
  return pairing.held?.text === event.text ? null : "noKeyPress";
}

/** The pairing once `event` is received, whether or not it was a Violation. */
export function pairKeys(pairing: KeyPairing, event: GameEvent): KeyPairing {
  switch (event.type) {
    case "keyDown":
      return { ...pairing, pendingCode: event.code };
    case "keyUp":
      return pairing.held?.code === event.code ? { ...pairing, held: null } : pairing;
    case "insert":
      return pairing.pendingCode === null
        ? pairing
        : { pendingCode: null, held: { code: pairing.pendingCode, text: event.text } };
    default:
      return pairing;
  }
}
