import {
  type ClientMessage,
  DUEL_GAME_CONFIG,
  type Outcome,
  type Participant,
  type Seat,
  type ServerMessage,
} from "@repo/duel-engine";
import { applyEvent, createGame, type Game, type Result } from "@repo/typing-engine";
import { create } from "zustand";
import { eventTime } from "../../game/clock/eventTime.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { type ClockSample, estimateClockOffset } from "../clock/estimateClockOffset.ts";

/** Why this Participant could not take a seat in the Duel. */
export type DuelRefusal =
  | "notFound"
  | "full"
  | "alreadySeated"
  | "nicknameRequired"
  | "unreachable";

type DuelState = {
  readonly phase: "connecting" | "waiting" | "countdown" | "running" | "finished" | "refused";
  readonly seat: Seat | null;
  readonly participants: readonly Participant[];
  readonly words: readonly string[];
  /** The Opponent's Game, replayed from their Events to place their caret and read their WPM. */
  readonly opponentGame: Game | null;
  /** How far the server's clock is ahead of this client's, `null` until the ping/pong exchanges end. */
  readonly clockOffset: number | null;
  /** Whole seconds left before the Start, shown during the Countdown. */
  readonly secondsLeft: number | null;
  readonly refusal: DuelRefusal | null;
  /** The server's Results and Outcomes, indexed by seat, once both Games are finished. */
  readonly end: {
    readonly results: readonly [Result, Result];
    readonly outcomes: readonly [Outcome, Outcome];
  } | null;
  readonly join: (duelId: string) => void;
  readonly leave: () => void;
};

// A few exchanges, so that one slow round trip does not skew the Start.
const CLOCK_SAMPLE_COUNT = 5;
const COUNTDOWN_REFRESH_MS = 100;

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
  return participants.length === 2 ? "full" : "alreadySeated";
}

const withParticipant = (participants: readonly Participant[], participant: Participant) =>
  [...participants.filter(({ seat }) => seat !== participant.seat), participant].toSorted(
    (a, b) => a.seat - b.seat,
  );

// Owned by the store because components may not run effects; one Duel is open at a time.
let socket: WebSocket | null = null;
let clockSamples: ClockSample[] = [];
/** The announced Start, in server time. */
let startAt: number | null = null;
let startTimer: ReturnType<typeof setTimeout> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let stopForwarding: (() => void) | null = null;

function send(message: ClientMessage) {
  socket?.send(JSON.stringify(message));
}

function ping() {
  send({ type: "ping", clientAt: eventTime() });
}

// The server applies the Participant's Events to its own copy of the Game, from the Start on.
function forwardEvents() {
  stopForwarding?.();
  stopForwarding = useGameStore.subscribe(({ lastEvent }, previous) => {
    if (lastEvent !== null && lastEvent !== previous.lastEvent) {
      send({ type: "event", event: lastEvent });
    }
  });
}

function stopTimers() {
  if (startTimer !== null) clearTimeout(startTimer);
  if (countdownTimer !== null) clearInterval(countdownTimer);
  startTimer = null;
  countdownTimer = null;
}

const initialState = {
  phase: "connecting",
  seat: null,
  participants: [],
  words: [],
  opponentGame: null,
  clockOffset: null,
  secondsLeft: null,
  refusal: null,
  end: null,
} as const;

export const useDuelStore = create<DuelState>()((set, get) => {
  const fireStart = () => {
    stopTimers();
    const at = eventTime();
    const gameStore = useGameStore.getState();
    gameStore.loadGame(DUEL_GAME_CONFIG, get().words);
    forwardEvents();
    gameStore.applyEvent({ type: "start", at });
    set({ phase: "running", secondsLeft: null });
  };

  // Waits for both the announced Start and the clock offset, whichever comes last.
  const scheduleStart = () => {
    const { clockOffset, phase } = get();
    if (startAt === null || clockOffset === null || phase === "running") return;
    stopTimers();
    // The announced instant, on this client's clock.
    const localStartAt = startAt - clockOffset;
    const refreshSecondsLeft = () =>
      set({ secondsLeft: Math.max(0, Math.ceil((localStartAt - eventTime()) / 1000)) });
    refreshSecondsLeft();
    countdownTimer = setInterval(refreshSecondsLeft, COUNTDOWN_REFRESH_MS);
    startTimer = setTimeout(fireStart, localStartAt - eventTime());
  };

  const receive = (message: ServerMessage) => {
    if (message.type === "state") {
      const opponentJournal = message.journals[message.seat === 0 ? 1 : 0];
      set({
        phase: "waiting",
        seat: message.seat,
        participants: message.participants,
        words: message.words,
        opponentGame: opponentJournal.reduce(
          applyEvent,
          createGame(DUEL_GAME_CONFIG, message.words),
        ),
      });
      clockSamples = [];
      ping();
    } else if (message.type === "presence") {
      set((state) => ({ participants: withParticipant(state.participants, message.participant) }));
    } else if (message.type === "pong") {
      const { clientAt, serverAt } = message;
      clockSamples.push({ sentAt: clientAt, serverAt, receivedAt: eventTime() });
      if (clockSamples.length < CLOCK_SAMPLE_COUNT) return ping();
      set({ clockOffset: estimateClockOffset(clockSamples) });
      scheduleStart();
    } else if (message.type === "opponentEvent") {
      const { opponentGame } = get();
      if (opponentGame !== null) set({ opponentGame: applyEvent(opponentGame, message.event) });
    } else if (message.type === "countdown") {
      startAt = message.startAt;
      if (get().phase === "waiting") set({ phase: "countdown" });
      scheduleStart();
    } else if (message.type === "end") {
      stopTimers();
      stopForwarding?.();
      stopForwarding = null;
      const { results, outcomes } = message;
      set({ phase: "finished", end: { results, outcomes } });
    }
  };

  const leave = () => {
    socket?.close();
    socket = null;
    clockSamples = [];
    startAt = null;
    stopTimers();
    stopForwarding?.();
    stopForwarding = null;
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
