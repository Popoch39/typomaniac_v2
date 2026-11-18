import {
  DUEL_GAME_CONFIG,
  type Outcome,
  opponentSeat,
  type Participant,
  type Seat,
  type ServerMessage,
} from "@repo/duel-engine";
import { applyEvent, createGame, type Game, type Result } from "@repo/typing-engine";
import { create } from "zustand";
import { useOpponentCaretStore } from "../../../shared/store/useOpponentCaretStore.ts";
import { eventTime } from "../../game/clock/eventTime.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { opponentCaretPosition } from "../caret/opponentCaretPosition.ts";
import {
  closeDuelSocket,
  type DuelRefusal,
  openDuelSocket,
  sendToDuel,
} from "../socket/duelSocket.ts";
import { useDuelClockStore } from "./useDuelClockStore.ts";
import { useDuelCountdownStore } from "./useDuelCountdownStore.ts";

type DuelState = {
  readonly phase: "connecting" | "waiting" | "countdown" | "running" | "finished" | "refused";
  readonly seat: Seat | null;
  readonly participants: readonly Participant[];
  readonly words: readonly string[];
  /** The Opponent's Game, replayed from their Events to place their caret and read their WPM. */
  readonly opponentGame: Game | null;
  readonly refusal: DuelRefusal | null;
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

// The server applies the Participant's Events to its own copy of the Game, from the Start on.
function forwardEvents() {
  stopForwarding?.();
  stopForwarding = useGameStore.subscribe(({ lastEvent }, previous) => {
    if (lastEvent !== null && lastEvent !== previous.lastEvent) {
      sendToDuel({ type: "event", event: lastEvent });
    }
  });
}

function stopForwardingEvents() {
  stopForwarding?.();
  stopForwarding = null;
}

const initialState = {
  phase: "connecting",
  seat: null,
  participants: [],
  words: [],
  opponentGame: null,
  refusal: null,
  end: null,
} as const;

export const useDuelStore = create<DuelState>()((set, get) => {
  const start = () => {
    const at = eventTime();
    const gameStore = useGameStore.getState();
    gameStore.loadGame(DUEL_GAME_CONFIG, get().words);
    forwardEvents();
    gameStore.applyEvent({ type: "start", at });
    set({ phase: "running" });
  };

  const receive = (message: ServerMessage) => {
    if (message.type === "state") {
      const ownJournal = message.journals[message.seat];
      const opponentJournal = message.journals[opponentSeat(message.seat)];
      // Only an accepted start opens a journal: a non-empty one means the Participant is back mid-Game.
      const resumed = ownJournal.length > 0;
      if (resumed) {
        forwardEvents();
        useGameStore.getState().loadGame(DUEL_GAME_CONFIG, message.words, ownJournal);
      }
      set({
        phase: resumed ? "running" : "waiting",
        seat: message.seat,
        participants: message.participants,
        words: message.words,
        opponentGame: opponentJournal.reduce(
          applyEvent,
          createGame(DUEL_GAME_CONFIG, message.words),
        ),
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
      const { phase } = get();
      // A Game already running or over has no Start left to wait for.
      if (phase !== "waiting" && phase !== "countdown") return;
      set({ phase: "countdown" });
      useDuelCountdownStore.getState().schedule(message.startAt, start);
    } else if (message.type === "end") {
      useDuelCountdownStore.getState().cancel();
      stopForwardingEvents();
      const { results, outcomes } = message;
      set({ phase: "finished", end: { results, outcomes } });
    }
  };

  const leave = () => {
    closeDuelSocket();
    useDuelClockStore.getState().reset();
    useDuelCountdownStore.getState().cancel();
    stopForwardingEvents();
    set(initialState);
  };

  return {
    ...initialState,
    join: (duelId) => {
      leave();
      openDuelSocket(duelId, { receive, refuse: (refusal) => set({ phase: "refused", refusal }) });
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
