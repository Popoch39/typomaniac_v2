import {
  DUEL_GAME_CONFIG,
  type FinishedRound,
  opponentSeat,
  type Participant,
  type RankedEnd,
  type RoundOutcomes,
  type Seat,
  type ServerMessage,
} from "@repo/duel-engine";
import type { Rank } from "@repo/ranked-engine";
import { applyEvent, createGame, type Game, type GameEvent } from "@repo/typing-engine";
import { create } from "zustand";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { useOpponentCaretStore } from "../../../shared/store/useOpponentCaretStore.ts";
import { eventTime, shiftEventTime } from "../../game/clock/eventTime.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { standingQueryKey } from "../../ranked/api/standingQueryOptions.ts";
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
    /** Between two Rounds, or after the last one: the Round that just ended is shown. */
    | "roundEnd"
    | "finished"
    | "refused"
    | "disconnected";
  readonly seat: Seat | null;
  readonly participants: readonly Participant[];
  /** The Rank of each Player of a ranked Duel, indexed by seat; `null` for a Custom Duel. */
  readonly ranks: readonly [Rank | null, Rank | null] | null;
  /** The current Round, which every Event sent to the server names. */
  readonly round: number | null;
  /** The Rounds already finished, in order: the Round score is counted from them. */
  readonly rounds: readonly FinishedRound[];
  /** The Target words of the current Round, empty until its Countdown is announced. */
  readonly words: readonly string[];
  /**
   * The Opponent's Game, replayed from their Events to place their caret and read their WPM;
   * `null` until the Target words are known.
   */
  readonly opponentGame: Game | null;
  /** Why the Participant could not take a seat, in words for the user. */
  readonly refusal: string | null;
  /**
   * The Outcomes of the Duel and, for a ranked Duel, what it did to each Player's Standing, both
   * indexed by seat, once the server has ended it.
   */
  readonly end: {
    readonly outcomes: RoundOutcomes;
    readonly ranked: readonly [RankedEnd, RankedEnd] | null;
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
  ranks: null,
  round: null,
  rounds: [],
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

  // Counts down to the Start of the next Round while the Round that just ended is shown. Nothing
  // starts from here: the Countdown message brings the Target words, and schedules the Start.
  const showNextStart = (startAt: number) =>
    useDuelCountdownStore.getState().schedule(startAt, () => undefined);

  const receive = (message: ServerMessage) => {
    if (message.type === "state") {
      const opponentJournal = message.journals[opponentSeat(message.seat)];
      // Only an accepted start opens a journal: a non-empty one means the Participant is back
      // mid-Game, which resumes with the Countdown that follows, once the announced Start is known.
      resumedJournal = message.journals[message.seat];
      // Back between two Rounds, or after the last one: the Round that just ended is shown, until
      // the Countdown of the next one or the end of the Duel.
      const afterRound =
        message.rounds.length > 0 &&
        (message.words === null || message.rounds.length >= message.round);
      set({
        phase: afterRound ? "roundEnd" : "waiting",
        seat: message.seat,
        participants: message.participants,
        ranks: message.ranks,
        round: message.round,
        rounds: message.rounds,
        words: message.words ?? [],
        // Without the Target words, the Countdown is still to come and brings them.
        opponentGame:
          message.words === null
            ? null
            : opponentJournal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, message.words)),
      });
      useDuelClockStore.getState().synchronise();
      if (afterRound && message.startAt !== null) showNextStart(message.startAt);
    } else if (message.type === "presence") {
      set((state) => ({ participants: withParticipant(state.participants, message.participant) }));
    } else if (message.type === "pong") {
      useDuelClockStore.getState().receivePong(message);
    } else if (message.type === "opponentEvent") {
      const { opponentGame } = get();
      if (opponentGame !== null) set({ opponentGame: applyEvent(opponentGame, message.event) });
    } else if (message.type === "countdown") {
      const seated = get();
      // A Round already finished has no Start left to wait for.
      if (message.round <= seated.rounds.length) return;
      // The journal handed back on joining is the one of the Round joined, not of a later one.
      if (message.round !== seated.round) resumedJournal = [];
      // A Participant seated before the Countdown learns the Target words of the Round from it.
      if (message.round !== seated.round || seated.opponentGame === null) {
        const { round, words } = message;
        set({ round, words, opponentGame: createGame(DUEL_GAME_CONFIG, words) });
      }
      const { phase } = get();
      // A Game already running or over has no Start left to wait for.
      if (phase !== "waiting" && phase !== "countdown" && phase !== "roundEnd") return;
      if (resumedJournal.length > 0) return resume(message.startAt);
      set({ phase: "countdown" });
      useDuelCountdownStore.getState().schedule(message.startAt, start);
    } else if (message.type === "roundEnd") {
      const { rounds } = get();
      // Only the Round that follows the finished ones: the state may already list this one.
      if (message.round !== rounds.length + 1) return;
      useDuelCountdownStore.getState().cancel();
      stopResumingGame();
      stopForwardingEvents();
      resumedJournal = [];
      const { results, outcomes } = message;
      set({ phase: "roundEnd", rounds: [...rounds, { results, outcomes }], opponentGame: null });
      if (message.nextStartAt !== null) showNextStart(message.nextStartAt);
    } else if (message.type === "end") {
      useDuelCountdownStore.getState().cancel();
      stopResumingGame();
      stopForwardingEvents();
      const { outcomes, ranked } = message;
      set({ phase: "finished", rounds: message.rounds, end: { outcomes, ranked } });
      // The Standing moved: the Ranked page and the profile read the new one.
      if (ranked !== null) void queryClient.invalidateQueries({ queryKey: standingQueryKey });
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
