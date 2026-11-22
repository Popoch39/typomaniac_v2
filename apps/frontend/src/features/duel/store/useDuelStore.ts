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
import { useBrowserHintsStore } from "../../game/store/useBrowserHintsStore.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { standingQueryKey } from "../../ranked/api/standingQueryOptions.ts";
import { opponentCaretPosition } from "../caret/opponentCaretPosition.ts";
import { eventClockShift } from "../clock/eventClockShift.ts";
import type { DuelPhase } from "../phase/duelPhase.ts";
import { closeDuelSocket, openDuelSocket, sendToDuel } from "../socket/duelSocket.ts";
import { useDuelClockStore } from "./useDuelClockStore.ts";
import { useDuelCountdownStore } from "./useDuelCountdownStore.ts";
import { useTierPromotionStore } from "./useTierPromotionStore.ts";

type DuelState = {
  readonly phase: DuelPhase;
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
  /** The reason the server gave as it closed the socket for good, once the phase is `disconnected`. */
  readonly closeReason: string | null;
  /**
   * Whether the socket dropped and is being reopened. The phase it dropped in stays shown until
   * the server says where the Duel is.
   */
  readonly isReconnecting: boolean;
  /**
   * The Outcomes of the Duel and, for a ranked Duel, what it did to each Player's Standing, both
   * indexed by seat, once the server has ended it.
   */
  readonly end: {
    readonly outcomes: RoundOutcomes;
    readonly ranked: readonly [RankedEnd, RankedEnd] | null;
  } | null;
  /** The Duel joined, which a navigation to another one must leave for it. */
  readonly duelId: string | null;
  readonly join: (duelId: string) => void;
  /** Joins `duelId` unless it is the Duel already joined. */
  readonly follow: (duelId: string) => void;
  readonly leave: () => void;
};

const withParticipant = (participants: readonly Participant[], participant: Participant) =>
  [...participants.filter(({ seat }) => seat !== participant.seat), participant].toSorted(
    (a, b) => a.seat - b.seat,
  );

let stopForwarding: (() => void) | null = null;

// The server applies the Participant's Events to its own copy of the Game of `round`, from the Start on.
// In a ranked Duel, the browser's hints on the Game go once, just ahead of the Event that ends it, so
// that the server holds them before the Round, and maybe the Duel, is saved.
function forwardEvents(round: number, ranked: boolean) {
  stopForwarding?.();
  stopForwarding = useGameStore.subscribe(({ lastEvent, game }, previous) => {
    if (lastEvent !== null && lastEvent !== previous.lastEvent) {
      const hints =
        ranked && game.status === "finished"
          ? useBrowserHintsStore.getState().take(navigator.webdriver)
          : null;
      if (hints !== null) sendToDuel({ type: "hints", round, hints });
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
  closeReason: null,
  isReconnecting: false,
  end: null,
  duelId: null,
} as const;

export const useDuelStore = create<DuelState>()((set, get) => {
  const start = () => {
    const { round, words, ranks } = get();
    if (round === null) return;
    // A Game the Participant starts runs on their own clock.
    shiftEventTime(0);
    const at = eventTime();
    const gameStore = useGameStore.getState();
    gameStore.loadGame(DUEL_GAME_CONFIG, words);
    useBrowserHintsStore.getState().reset();
    forwardEvents(round, ranks !== null);
    gameStore.applyEvent({ type: "start", at });
    set({ phase: "running" });
  };

  // Resumes the Game of a Participant who is back mid-Game, on the clock that Game was started on.
  const resume = (startAt: number) => {
    const journal = resumedJournal;
    const [started] = journal;
    const { round, words, ranks } = get();
    if (started?.type !== "start" || round === null) return;
    const load = (clockOffset: number | null) => {
      const shift = eventClockShift({ gameStartedAt: started.at, startAt, clockOffset });
      if (shift === null) return;
      stopResumingGame();
      shiftEventTime(shift);
      // The keys counted before the socket dropped still count: the Game goes on.
      forwardEvents(round, ranks !== null);
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
      // Back in a Round under way, whose Countdown follows: the screen it dropped on stays until then.
      const isResuming = get().isReconnecting && !afterRound && message.words !== null;
      set({
        phase: afterRound ? "roundEnd" : isResuming ? get().phase : "waiting",
        isReconnecting: isResuming,
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
      const { phase, isReconnecting } = get();
      set({ isReconnecting: false });
      // A Game already running or over has no Start left to wait for, unless it ran on a socket
      // that dropped since.
      if (!isReconnecting && phase !== "waiting" && phase !== "countdown" && phase !== "roundEnd")
        return;
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
      const { results, multipliers, outcomes } = message;
      set({
        phase: "roundEnd",
        isReconnecting: false,
        rounds: [...rounds, { results, multipliers, outcomes }],
        opponentGame: null,
      });
      if (message.nextStartAt !== null) showNextStart(message.nextStartAt);
    } else if (message.type === "end") {
      useDuelCountdownStore.getState().cancel();
      stopResumingGame();
      stopForwardingEvents();
      const { outcomes, ranked } = message;
      const { seat } = get();
      // Opened with the end, so that the LP bar it holds mounts held.
      if (ranked !== null && seat !== null) useTierPromotionStore.getState().end(ranked[seat]);
      set({
        phase: "finished",
        isReconnecting: false,
        rounds: message.rounds,
        end: { outcomes, ranked },
      });
      // The Standing moved: the Ranked page and the profile read the new one.
      if (ranked !== null) void queryClient.invalidateQueries({ queryKey: standingQueryKey });
    }
  };

  // Whatever runs on the socket stops with it: the fresh join that follows starts it again.
  const stopFollowingSocket = () => {
    useDuelCountdownStore.getState().cancel();
    stopResumingGame();
    stopForwardingEvents();
  };

  const reconnect = () => {
    // The server closes nothing a finished Duel still needs.
    if (get().phase === "finished") return false;
    stopFollowingSocket();
    set({ isReconnecting: true });
    return true;
  };

  const disconnect = (closeReason: string) => {
    if (get().phase === "finished") return;
    stopFollowingSocket();
    set({ phase: "disconnected", closeReason, isReconnecting: false });
  };

  const leave = () => {
    closeDuelSocket();
    useDuelClockStore.getState().reset();
    useDuelCountdownStore.getState().cancel();
    stopResumingGame();
    resumedJournal = [];
    shiftEventTime(0);
    stopForwardingEvents();
    useTierPromotionStore.getState().reset();
    set(initialState);
  };

  const join = (duelId: string) => {
    leave();
    set({ duelId });
    openDuelSocket(duelId, {
      receive,
      refuse: (refusal) => set({ phase: "refused", refusal }),
      reconnect,
      disconnect,
    });
  };

  return {
    ...initialState,
    join,
    follow: (duelId) => {
      if (get().duelId !== duelId) join(duelId);
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
        : { ...opponentCaretPosition(opponentGame), opponent },
    );
});
