import type { ClientMessage, ServerMessage } from "@repo/duel-engine";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { reconnectDelay } from "../../../shared/lib/reconnectDelay.ts";
import { duelQueryOptions } from "../api/duelQueryOptions.ts";
import { parseServerMessage } from "../message/parseServerMessage.ts";

type DuelSocketHandlers = {
  readonly receive: (message: ServerMessage) => void;
  /** Told, in words for the user, why this Participant could not take a seat in the Duel. */
  readonly refuse: (refusal: string) => void;
  /**
   * The socket dropped and is about to be reopened, unless this answers `false` because the
   * Participant no longer needs it.
   */
  readonly reconnect: () => boolean;
  /** The socket closed after the Participant was seated, and is not reopened. */
  readonly disconnect: () => void;
};

const REFUSALS = { NICKNAME_REQUIRED: "Choose a Nickname to join this Duel." };
const FULL = "This Duel is full: two Participants are already in it.";
const UNREACHABLE = "The Duel could not be reached. Try again in a moment.";

const socketUrl = (duelId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/duels/${duelId}/socket`;
};

// A browser never shows why an upgrade was refused: the Duel is read over HTTP to tell the reason.
async function findRefusal(duelId: string) {
  try {
    const { participants } = await queryClient.fetchQuery(duelQueryOptions(duelId));
    return participants.length === 2 ? FULL : UNREACHABLE;
  } catch (error) {
    return describeApiError(error, REFUSALS);
  }
}

// Owned by the Duel stores because components may not run effects; one Duel is open at a time.
let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// `attempt` counts the tries to reopen the socket since it was last seated, 0 for a first join.
function connect(duelId: string, handlers: DuelSocketHandlers, attempt: number) {
  const { receive, refuse, reconnect, disconnect } = handlers;
  const opened = new WebSocket(socketUrl(duelId));
  socket = opened;
  let seated = false;
  opened.addEventListener("message", (event) => {
    seated = true;
    const message = parseServerMessage(String(event.data));
    if (message !== null) receive(message);
  });
  opened.addEventListener("close", async ({ code }) => {
    if (socket !== opened) return;
    if (seated || attempt > 0) {
      // A reconnection is a fresh join: the server sends the state first, as for any seat claim.
      const nextAttempt = seated ? 1 : attempt + 1;
      const delay = reconnectDelay(code, nextAttempt);
      if (delay === null || !reconnect()) return disconnect();
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect(duelId, handlers, nextAttempt);
      }, delay);
      return;
    }
    const refusal = await findRefusal(duelId);
    if (socket === opened) refuse(refusal);
  });
}

/** Opens the socket of a Duel in place of any other, and hands over each message it reads. */
export function openDuelSocket(duelId: string, handlers: DuelSocketHandlers) {
  closeDuelSocket();
  connect(duelId, handlers, 0);
}

export function sendToDuel(message: ClientMessage) {
  socket?.send(JSON.stringify(message));
}

export function closeDuelSocket() {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
  socket?.close();
  socket = null;
}
