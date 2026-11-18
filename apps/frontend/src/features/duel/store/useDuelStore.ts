import {
  DUEL_GAME_CONFIG,
  type Outcome,
  opponentSeat,
  type Participant,
  type Seat,
  type ServerMessage,
} from "@repo/duel-engine";
import {
  applyEvent,
  createGame,
  type Game,
  type GameEvent,
  type Result,
} from "@repo/typing-engine";
import { create } from "zustand";
import { useOpponentCaretStore } from "../../../shared/store/useOpponentCaretStore.ts";
import { eventTime, shiftEventTime } from "../../game/clock/eventTime.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { opponentCaretPosition } from "../caret/opponentCaretPosition.ts";
import { eventClockShift } from "../clock/eventClockShift.ts";
import { closeDuelSocket, openDuelSocket, sendToDuel } from "../socket/duelSocket.ts";
import { useDuelClockStore } from "./useDuelClockStore.ts";
import { useDuelCountdownStore } from "./useDuelCountdownStore.ts";

type DuelState = {
  readonly phase:
    | "connecting"
    | "waiting"
    | "countdown"
    | "running"
    | "finished"
    | "refused"
    | "disconnected";
  readonly seat: Seat | null;
  readonly participants: readonly Participant[];
  /** The current Round, which every Event sent to the server names. */
  readonly round: number | null;
  /** The Target words of the current Round, empty until its Countdown is announced. */
  readonly words: readonly string[];
  /**
   * The Opponent's Game, replayed from their Events to place their caret and read their WPM;
   * `null` until the Target words are known.
   */
  readonly opponentGame: Game | null;
  /** Why the Participant could not take a seat, in words for the user. */
  readonly refusal: string | null;
  /** The server's Results and Outcomes, indexed by seat, once both Games are finished. */
  readonly end: {
    readonly results: readonly [Result, Result];
    readonly outcomes: readonly [Outcome, Outcome];
  } | null;
  readonly join: (duelId: string) => void;
  readonly leave: () => void;
};

const withParticipant = (participants: readonly Participant[], participant: Participant) =>
  [...participants.filter(({ seat }) => seat !== participant.seat), participant].toSorted(
    (a, b) => a.seat - b.seat,
  );

let stopForwarding: (() => void) | null = null;

// The server applies the Participant's Events to its own copy of the Game of `round`, from the Start on.
function forwardEvents(round: number) {
  stopForwarding?.();
  stopForwarding = useGameStore.subscribe(({ lastEvent }, previous) => {
    if (lastEvent !== null && lastEvent !== previous.lastEvent) {
      sendToDuel({ type: "event", round, event: lastEvent });
    }
  });
}

function stopForwardingEvents() {
  stopForwarding?.();
  stopForwarding = null;
}

// The Participant's own journal, handed back on returning mid-Game and replayed once its clock is known.
let resumedJournal: readonly GameEvent[] = [];
let stopResuming: (() => void) | null = null;

function stopResumingGame() {
  stopResuming?.();
  stopResuming = null;
}

const initialState = {
  phase: "connecting",
  seat: null,
  participants: [],
  round: null,
  words: [],
  opponentGame: null,
  refusal: null,
  end: null,
} as const;

export const useDuelStore = create<DuelState>()((set, get) => {
  const start = () => {
    const { round, words } = get();
    if (round === null) return;
    // A Game the Participant starts runs on their own clock.
    shiftEventTime(0);
    const at = eventTime();
    const gameStore = useGameStore.getState();
    gameStore.loadGame(DUEL_GAME_CONFIG, words);
    forwardEvents(round);
    gameStore.applyEvent({ type: "start", at });
    set({ phase: "running" });
  };

  // Resumes the Game of a Participant who is back mid-Game, on the clock that Game was started on.
  const resume = (startAt: number) => {
    const journal = resumedJournal;
    const [started] = journal;
    const { round, words } = get();
    if (started?.type !== "start" || round === null) return;
    const load = (clockOffset: number | null) => {
      const shift = eventClockShift({ gameStartedAt: started.at, startAt, clockOffset });
      if (shift === null) return;
      stopResumingGame();
      shiftEventTime(shift);
      forwardEvents(round);
      useGameStore.getState().loadGame(DUEL_GAME_CONFIG, words, journal);
      set({ phase: "running" });
    };
    stopResumingGame();
    // A Game on the server's clock waits for the clock offset before any of its Events is stamped.
    stopResuming = useDuelClockStore.subscribe(({ clockOffset }) => load(clockOffset));
    load(useDuelClockStore.getState().clockOffset);
  };

  const receive = (message: ServerMessage) => {
    if (message.type === "state") {
      const opponentJournal = message.journals[opponentSeat(message.seat)];
      // Only an accepted start opens a journal: a non-empty one means the Participant is back
      // mid-Game, which resumes with the Countdown that follows, once the announced Start is known.
      resumedJournal = message.journals[message.seat];
      set({
        phase: "waiting",
        seat: message.seat,
        participants: message.participants,
        round: message.round,
        words: message.words ?? [],
        // Without the Target words, the Countdown is still to come and brings them.
        opponentGame:
          message.words === null
            ? null
            : opponentJournal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, message.words)),
      });
      useDuelClockStore.getState().synchronise();
    } else if (message.type === "presence") {
      set((state) => ({ participants: withParticipant(state.participants, message.participant) }));
    } else if (message.type === "pong") {
      useDuelClockStore.getState().receivePong(message);
    } else if (message.type === "opponentEvent") {
      const { opponentGame } = get();
      if (opponentGame !== null) set({ opponentGame: applyEvent(opponentGame, message.event) });
    } else if (message.type === "countdown") {
      // A Participant seated before the Countdown learns the Target words of the Round from it.
      if (get().opponentGame === null) {
        const { round, words } = message;
        set({ round, words, opponentGame: createGame(DUEL_GAME_CONFIG, words) });
      }
      const { phase } = get();
      // A Game already running or over has no Start left to wait for.
      if (phase !== "waiting" && phase !== "countdown") return;
      if (resumedJournal.length > 0) return resume(message.startAt);
      set({ phase: "countdown" });
      useDuelCountdownStore.getState().schedule(message.startAt, start);
    } else if (message.type === "end") {
      useDuelCountdownStore.getState().cancel();
      stopResumingGame();
      stopForwardingEvents();
      const { results, outcomes } = message;
      set({ phase: "finished", end: { results, outcomes } });
    }
  };

  const disconnect = () => {
    // The server closes nothing a finished Duel still needs.
    if (get().phase === "finished") return;
    useDuelCountdownStore.getState().cancel();
    stopResumingGame();
    stopForwardingEvents();
    set({ phase: "disconnected" });
  };

  const leave = () => {
    closeDuelSocket();
    useDuelClockStore.getState().reset();
    useDuelCountdownStore.getState().cancel();
    stopResumingGame();
    resumedJournal = [];
    shiftEventTime(0);
    stopForwardingEvents();
    set(initialState);
  };

  return {
    ...initialState,
    join: (duelId) => {
      leave();
      openDuelSocket(duelId, {
        receive,
        refuse: (refusal) => set({ phase: "refused", refusal }),
        disconnect,
      });
    },
    leave,
  };
});

// The game feature draws the Opponent's caret from the shared store, without knowing of the Duel.
useDuelStore.subscribe(({ opponentGame, participants, seat }) => {
  const opponent = participants.find((participant) => participant.seat !== seat);
  useOpponentCaretStore
    .getState()
    .show(
      opponentGame === null || opponent === undefined
        ? null
        : { ...opponentCaretPosition(opponentGame), name: opponent.name },
    );
});
