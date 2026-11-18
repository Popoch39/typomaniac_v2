import type { ClientMessage, Participant, ServerMessage } from "@repo/duel-engine";
import { parseServerMessage } from "../message/parseServerMessage.ts";

/** Why this Participant could not take a seat in the Duel. */
export type DuelRefusal = "notFound" | "full" | "nicknameRequired" | "unreachable";

type DuelSocketHandlers = {
  readonly receive: (message: ServerMessage) => void;
  readonly refuse: (refusal: DuelRefusal) => void;
};

const socketUrl = (duelId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/duels/${duelId}/socket`;
};

// A browser never shows why an upgrade was refused: the Duel is read over HTTP to tell the reason.
async function findRefusal(duelId: string): Promise<DuelRefusal> {
  const response = await fetch(`/api/duels/${duelId}`);
  if (response.status === 403) return "nicknameRequired";
  if (response.status === 404) return "notFound";
  if (!response.ok) return "unreachable";
  const { participants } = (await response.json()) as { participants: Participant[] };
  return participants.length === 2 ? "full" : "unreachable";
}

// Owned by the Duel stores because components may not run effects; one Duel is open at a time.
let socket: WebSocket | null = null;

/** Opens the socket of a Duel in place of any other, and hands over each message it reads. */
export function openDuelSocket(duelId: string, { receive, refuse }: DuelSocketHandlers) {
  closeDuelSocket();
  const opened = new WebSocket(socketUrl(duelId));
  socket = opened;
  let seated = false;
  opened.addEventListener("message", (event) => {
    seated = true;
    const message = parseServerMessage(String(event.data));
    if (message !== null) receive(message);
  });
  opened.addEventListener("close", async () => {
    if (seated || socket !== opened) return;
    const refusal = await findRefusal(duelId).catch((): DuelRefusal => "unreachable");
    if (socket === opened) refuse(refusal);
  });
}

export function sendToDuel(message: ClientMessage) {
  socket?.send(JSON.stringify(message));
}

export function closeDuelSocket() {
  socket?.close();
  socket = null;
}
