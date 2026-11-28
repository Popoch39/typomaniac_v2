import type { PairingSide, QueueRemovalReason, QueueServerMessage } from "@repo/matchmaking-engine";
import type { SocketLink } from "../../../shared/link/socketLink.ts";
import { type AcceptWindow, acceptSecondsLeft } from "../clock/acceptSecondsLeft.ts";
import type { QueueEntry } from "../clock/waitingSeconds.ts";

type Queued = {
  readonly kind: "queued";
  readonly entry: QueueEntry;
  /** Back in the Queue because the Opponent did not accept. */
  readonly requeued: boolean;
};

/** A Pairing awaits acceptance, by the Player or by the Opponent. */
type Proposed = {
  readonly kind: "proposed";
  readonly pairingId: string;
  readonly players: { readonly self: PairingSide; readonly opponent: PairingSide };
  readonly window: AcceptWindow;
  /** Whole seconds there were to accept when the Pairing was first proposed, what the countdown drains from. */
  readonly acceptSeconds: number;
  /** The Player accepted and now waits for the Opponent. */
  readonly accepted: boolean;
};

/** Where the Player stands with the Queue in this tab, as its socket tells it. */
export type QueuePhase =
  | { readonly kind: "idle" }
  /** The Player asked to enter: the socket is opening. */
  | { readonly kind: "connecting" }
  | Queued
  | Proposed
  /** The socket dropped and is being reopened, the Queue or the Pairing it held staying shown. */
  | { readonly kind: "reconnecting"; readonly held: Queued | Proposed }
  /** Both accepted: the ranked Duel to go to. */
  | { readonly kind: "paired"; readonly duelId: string }
  | { readonly kind: "removed"; readonly reason: QueueRemovalReason }
  /** Why the Player could not enter the Queue, in words for the user. */
  | { readonly kind: "refused"; readonly refusal: string }
  /** The socket closed for good while the Player was in the Queue. */
  | { readonly kind: "disconnected" };

/** A phase that tells the Player why they are not queued, until they close it or enter again. */
export type QueueNoticePhase = Extract<
  QueuePhase,
  { kind: "removed" | "refused" | "disconnected" }
>;

export type QueuePhaseEvent =
  | { readonly kind: "enter" }
  | { readonly kind: "leave" }
  /** `receivedAt` is the instant this client received `message`, on its own clock. */
  | { readonly kind: "receive"; readonly message: QueueServerMessage; readonly receivedAt: number }
  | { readonly kind: "link"; readonly link: SocketLink }
  /** The Player accepts the Pairing proposed to them. */
  | { readonly kind: "accept" }
  /** The Player's acceptance of the Pairing reached the socket. */
  | { readonly kind: "accepted"; readonly pairingId: string }
  /** The Player closes the notice telling them why they are not queued. */
  | { readonly kind: "dismiss" };

/**
 * `close` closes the Queue socket, `open` opens it in place of any other. `sendAccept` sends the
 * acceptance, which is only one once the socket carried it. The clock runs from `startClock` to
 * `stopClock`, exactly while a waiting time or an accept countdown is on screen. `goToDuel` takes
 * the Player to the ranked Duel both accepted, from whatever page they are on. `leaveGame` abandons
 * the Practice Game for a fresh ready one, when the Pairing prompt opens and when it closes on
 * anything but the Duel.
 */
export type QueuePhaseEffect =
  | { readonly kind: "close" }
  | { readonly kind: "open" }
  | { readonly kind: "sendAccept"; readonly pairingId: string }
  | { readonly kind: "goToDuel"; readonly duelId: string }
  | { readonly kind: "startClock" }
  | { readonly kind: "stopClock" }
  | { readonly kind: "leaveGame" };

type QueueTransition = {
  readonly phase: QueuePhase;
  readonly effects: readonly QueuePhaseEffect[];
};

export const IDLE_QUEUE: QueuePhase = { kind: "idle" };

/** The Queue or the Pairing on screen: the one a reconnect holds, or the phase itself. */
export function shownQueuePhase(phase: QueuePhase) {
  return phase.kind === "reconnecting" ? phase.held : phase;
}

export const isQueueNotice = (phase: QueuePhase): phase is QueueNoticePhase =>
  phase.kind === "removed" || phase.kind === "refused" || phase.kind === "disconnected";

/** Whether the socket holds the Player's place in the Queue, so that a drop is worth reopening. */
const isInQueue = (phase: QueuePhase) =>
  phase.kind === "queued" || phase.kind === "proposed" || phase.kind === "reconnecting";

function nextOfMessage(
  phase: QueuePhase,
  message: QueueServerMessage,
  receivedAt: number,
): QueuePhase {
  switch (message.type) {
    case "queued":
    case "requeued": {
      const { queuedAt, serverAt } = message;
      return {
        kind: "queued",
        entry: { queuedAt, serverAt, receivedAt },
        requeued: message.type === "requeued",
      };
    }
    case "proposed": {
      const { pairingId, players, acceptWithinMs, accepted } = message;
      const window = { acceptWithinMs, receivedAt };
      const shown = shownQueuePhase(phase);
      return {
        kind: "proposed",
        pairingId,
        players,
        window,
        // Proposed again after a reconnect: the countdown keeps draining from where it started.
        acceptSeconds:
          shown.kind === "proposed" && shown.pairingId === pairingId
            ? shown.acceptSeconds
            : acceptSecondsLeft(window, receivedAt),
        accepted,
      };
    }
    case "paired":
      return { kind: "paired", duelId: message.duelId };
    case "removed":
      return { kind: "removed", reason: message.reason };
  }
}

function nextOfLink(phase: QueuePhase, link: SocketLink): QueueTransition {
  if (link.kind === "refused")
    return { phase: { kind: "refused", refusal: link.refusal }, effects: [] };
  if (link.kind === "backoff") {
    if (phase.kind === "queued" || phase.kind === "proposed")
      return { phase: { kind: "reconnecting", held: phase }, effects: [] };
    if (phase.kind === "reconnecting") return { phase, effects: [] };
    // A removed or paired Player was already told why: the close that follows adds nothing.
    return { phase, effects: [{ kind: "close" }] };
  }
  if (link.kind === "down" && isInQueue(phase))
    return { phase: { kind: "disconnected" }, effects: [] };
  return { phase, effects: [] };
}

function nextOfEvent(phase: QueuePhase, event: QueuePhaseEvent): QueueTransition {
  switch (event.kind) {
    case "enter":
      return { phase: { kind: "connecting" }, effects: [{ kind: "close" }, { kind: "open" }] };
    case "leave":
      return { phase: IDLE_QUEUE, effects: [{ kind: "close" }] };
    case "receive":
      // Only a socket the Player still needs is read: it is closed in every other phase.
      if (phase.kind !== "connecting" && !isInQueue(phase)) return { phase, effects: [] };
      return {
        phase: nextOfMessage(phase, event.message, event.receivedAt),
        effects:
          event.message.type === "paired"
            ? [{ kind: "goToDuel", duelId: event.message.duelId }]
            : [],
      };
    case "link":
      return nextOfLink(phase, event.link);
    case "accept":
      return {
        phase,
        effects:
          phase.kind === "proposed" && !phase.accepted
            ? [{ kind: "sendAccept", pairingId: phase.pairingId }]
            : [],
      };
    case "accepted":
      return {
        phase:
          phase.kind === "proposed" && phase.pairingId === event.pairingId
            ? { ...phase, accepted: true }
            : phase,
        effects: [],
      };
    case "dismiss":
      // The socket of a notice is already closed: a notice never outlives it on its own.
      return { phase: isQueueNotice(phase) ? IDLE_QUEUE : phase, effects: [] };
  }
}

const isShowingTime = (phase: QueuePhase) => {
  const { kind } = shownQueuePhase(phase);
  return kind === "queued" || kind === "proposed";
};

const isPrompting = (phase: QueuePhase) => shownQueuePhase(phase).kind === "proposed";

/**
 * The Practice Game is left as the prompt opens, so that no clock runs under it and no distorted
 * Result follows, and again as it closes, so that the Player finds a ready Game whose typing area
 * takes the focus back. The ranked Duel loads its own Game.
 */
function leavesGame(phase: QueuePhase, next: QueuePhase) {
  return isPrompting(phase) !== isPrompting(next) && next.kind !== "paired";
}

export function nextQueuePhase(phase: QueuePhase, event: QueuePhaseEvent): QueueTransition {
  const next = nextOfEvent(phase, event);
  const effects: QueuePhaseEffect[] = [...next.effects];
  const wasShowingTime = isShowingTime(phase);
  const showsTime = isShowingTime(next.phase);
  if (wasShowingTime !== showsTime) effects.push({ kind: showsTime ? "startClock" : "stopClock" });
  if (leavesGame(phase, next.phase)) effects.push({ kind: "leaveGame" });
  return { phase: next.phase, effects };
}
