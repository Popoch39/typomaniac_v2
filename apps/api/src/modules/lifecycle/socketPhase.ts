/**
 * Where a server socket stands between its open and its close (ADR 0018). Its open is async and its
 * close may land during any of its awaits: whoever owns what the open took lets go of it, never both.
 */
export type SocketPhase =
  /** `open` is running: a close now leaves the release to `open`, at its next step. */
  | { readonly kind: "opening" }
  /** `open` ran to its end: a close releases what it took. */
  | { readonly kind: "seated" }
  /** Closed, and what the open took is being let go of. */
  | { readonly kind: "closing" }
  | { readonly kind: "closed" };

export type SocketPhaseEvent =
  /** `open` ran to its end, having let go of what it took if the socket closed meanwhile. */
  | { readonly kind: "opened" }
  /** The close handler of the socket runs. */
  | { readonly kind: "close" }
  /** The close handler let go of what the open took. */
  | { readonly kind: "released" };

/** `release`: the close handler lets go of what the open took. */
export type SocketPhaseEffect = "release" | null;

const OPENING: SocketPhase = { kind: "opening" };
const SEATED: SocketPhase = { kind: "seated" };
const CLOSING: SocketPhase = { kind: "closing" };
const CLOSED: SocketPhase = { kind: "closed" };

export function nextSocketPhase(
  phase: SocketPhase,
  event: SocketPhaseEvent,
): { readonly phase: SocketPhase; readonly effect: SocketPhaseEffect } {
  switch (event.kind) {
    case "opened":
      if (phase.kind === "opening") return { phase: SEATED, effect: null };
      // Closed while opening: the open has let go of what it took.
      if (phase.kind === "closing") return { phase: CLOSED, effect: null };
      return { phase, effect: null };
    case "close":
      if (phase.kind === "opening") return { phase: CLOSING, effect: null };
      if (phase.kind === "seated") return { phase: CLOSING, effect: "release" };
      return { phase, effect: null };
    case "released":
      return { phase: phase.kind === "closing" ? CLOSED : phase, effect: null };
  }
}

/**
 * The phase of each socket of a route, by socket id. `open` must be called synchronously at the
 * start of the open handler, and `isOpening` checked after each of its awaits.
 */
export const createSocketPhases = () => {
  // A socket absent is closed, so that a closed socket holds no memory.
  const phases = new Map<string, SocketPhase>();
  return {
    open: (id: string) => {
      phases.set(id, OPENING);
    },
    /** Whether the open may go on: false once the socket closed, when it lets go of what it took. */
    isOpening: (id: string) => phases.get(id)?.kind === "opening",
    advance: (id: string, event: SocketPhaseEvent) => {
      const { phase, effect } = nextSocketPhase(phases.get(id) ?? CLOSED, event);
      if (phase.kind === "closed") phases.delete(id);
      else phases.set(id, phase);
      return effect;
    },
  };
};
