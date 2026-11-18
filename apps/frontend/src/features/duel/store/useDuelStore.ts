import type { Participant, Seat, ServerMessage } from "@repo/duel-engine";
import { create } from "zustand";

/** Why this Participant could not take a seat in the Duel. */
export type DuelRefusal =
  | "notFound"
  | "full"
  | "alreadySeated"
  | "signInRequired"
  | "nicknameRequired"
  | "unreachable";

type DuelState = {
  readonly phase: "connecting" | "waiting" | "refused";
  readonly seat: Seat | null;
  readonly participants: readonly Participant[];
  readonly refusal: DuelRefusal | null;
  readonly join: (duelId: string) => void;
  readonly leave: () => void;
};

const socketUrl = (duelId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/duels/${duelId}/socket`;
};

// A browser never shows why an upgrade was refused: the Duel is read over HTTP to tell the reason.
async function findRefusal(duelId: string): Promise<DuelRefusal> {
  const response = await fetch(`/api/duels/${duelId}`);
  if (response.status === 401) return "signInRequired";
  if (response.status === 403) return "nicknameRequired";
  if (response.status === 404) return "notFound";
  if (!response.ok) return "unreachable";
  const { participants } = (await response.json()) as { participants: Participant[] };
  return participants.length === 2 ? "full" : "alreadySeated";
}

const withParticipant = (participants: readonly Participant[], participant: Participant) =>
  [...participants.filter(({ seat }) => seat !== participant.seat), participant].toSorted(
    (a, b) => a.seat - b.seat,
  );

// Owned by the store because components may not run effects; one Duel is open at a time.
let socket: WebSocket | null = null;

const initialState = { phase: "connecting", seat: null, participants: [], refusal: null } as const;

export const useDuelStore = create<DuelState>()((set) => {
  const receive = (message: ServerMessage) => {
    if (message.type === "state") {
      set({ phase: "waiting", seat: message.seat, participants: message.participants });
    } else if (message.type === "presence") {
      set((state) => ({ participants: withParticipant(state.participants, message.participant) }));
    }
  };

  const leave = () => {
    socket?.close();
    socket = null;
    set(initialState);
  };

  return {
    ...initialState,
    join: (duelId) => {
      leave();
      const opened = new WebSocket(socketUrl(duelId));
      socket = opened;
      let seated = false;
      opened.addEventListener("message", (event) => {
        seated = true;
        receive(JSON.parse(String(event.data)) as ServerMessage);
      });
      opened.addEventListener("close", async () => {
        if (seated || socket !== opened) return;
        const refusal = await findRefusal(duelId).catch((): DuelRefusal => "unreachable");
        if (socket === opened) set({ phase: "refused", refusal });
      });
    },
    leave,
  };
});
