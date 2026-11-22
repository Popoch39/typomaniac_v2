import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { create } from "zustand";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { useOpponentCaretStore } from "../../../shared/store/useOpponentCaretStore.ts";
import { eventTime, shiftEventTime } from "../../game/clock/eventTime.ts";
import { useBrowserHintsStore } from "../../game/store/useBrowserHintsStore.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { standingQueryKey } from "../../ranked/api/standingQueryOptions.ts";
import { opponentCaretPosition } from "../caret/opponentCaretPosition.ts";
import { eventClockShift } from "../clock/eventClockShift.ts";
import {
  type Duel,
  type DuelEffect,
  type DuelEvent,
  type DuelPhase,
  INITIAL_DUEL,
  nextDuel,
  shownPhase,
} from "../phase/duelPhase.ts";
import {
  closeDuelSocket,
  dropDuelSocket,
  openDuelSocket,
  sendToDuel,
} from "../socket/duelSocket.ts";
import { useDuelClockStore } from "./useDuelClockStore.ts";
import { useDuelCountdownStore } from "./useDuelCountdownStore.ts";
import { useTierPromotionStore } from "./useTierPromotionStore.ts";

// `phase` and `isReconnecting` mirror the lifecycle, computed once in `readOut`: components narrow on
// `lifecycle`, and the store's tests read them through `getState()`.
type DuelState = Duel & {
  /** The phase the screen shows, read from the lifecycle. */
  readonly phase: DuelPhase;
  /** Whether the socket dropped and the server has not answered its reopening yet. */
  readonly isReconnecting: boolean;
  /** The Duel joined, which a navigation to another one must leave for it. */
  readonly duelId: string | null;
  readonly join: (duelId: string) => void;
  /** Joins `duelId` unless it is the Duel already joined. */
  readonly follow: (duelId: string) => void;
  readonly leave: () => void;
};

const readOut = (duel: Duel) => ({
  ...duel,
  phase: shownPhase(duel.lifecycle).kind,
  isReconnecting: duel.lifecycle.kind === "reconnecting",
});

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

let stopResuming: (() => void) | null = null;

function stopResumingGame() {
  stopResuming?.();
  stopResuming = null;
}

function stopRound() {
  useDuelCountdownStore.getState().cancel();
  stopResumingGame();
  stopForwardingEvents();
}

const initialState = { ...readOut(INITIAL_DUEL), duelId: null };

export const useDuelStore = create<DuelState>()((set, get) => {
  const dispatch = (event: DuelEvent) => {
    const { duel, effects } = nextDuel(get(), event);
    set(readOut(duel));
    for (const effect of effects) perform(effect);
  };

  const start = () => {
    const { lifecycle, ranks } = get();
    if (lifecycle.kind !== "countdown") return;
    const { round, words } = lifecycle;
    // A Game the Participant starts runs on their own clock.
    shiftEventTime(0);
    const at = eventTime();
    const gameStore = useGameStore.getState();
    gameStore.loadGame(DUEL_GAME_CONFIG, words);
    useBrowserHintsStore.getState().reset();
    forwardEvents(round, ranks !== null);
    gameStore.applyEvent({ type: "start", at });
    dispatch({ kind: "run", round, words });
  };

  // Resumes the Game of a Participant who is back mid-Game, on the clock that Game was started on.
  const resume = ({ round, words, journal, startAt }: Extract<DuelEffect, { kind: "resume" }>) => {
    const [started] = journal;
    if (started?.type !== "start") return;
    const load = (clockOffset: number | null) => {
      const shift = eventClockShift({ gameStartedAt: started.at, startAt, clockOffset });
      if (shift === null) return;
      stopResumingGame();
      shiftEventTime(shift);
      // The keys counted before the socket dropped still count: the Game goes on.
      forwardEvents(round, get().ranks !== null);
      useGameStore.getState().loadGame(DUEL_GAME_CONFIG, words, journal);
      dispatch({ kind: "run", round, words });
    };
    stopResumingGame();
    // A Game on the server's clock waits for the clock offset before any of its Events is stamped.
    stopResuming = useDuelClockStore.subscribe(({ clockOffset }) => load(clockOffset));
    load(useDuelClockStore.getState().clockOffset);
  };

  const perform = (effect: DuelEffect) => {
    switch (effect.kind) {
      case "synchronise":
        return useDuelClockStore.getState().synchronise({ send: sendToDuel, drop: dropDuelSocket });
      case "pong":
        return useDuelClockStore.getState().receivePong(effect);
      case "showNextStart":
        return useDuelCountdownStore.getState().display(effect.startAt);
      case "schedule":
        return useDuelCountdownStore.getState().schedule(effect.startAt, start);
      case "resume":
        return resume(effect);
      case "stopRound":
        return stopRound();
      case "stopSync":
        return useDuelClockStore.getState().stop();
      case "freeze":
        return useGameStore.getState().freeze();
      case "closeSocket":
        return closeDuelSocket();
      case "ended":
        if (effect.own === null) return;
        useTierPromotionStore.getState().end(effect.own);
        // The Standing moved: the Ranked page and the profile read the new one.
        void queryClient.invalidateQueries({ queryKey: standingQueryKey });
    }
  };

  const leave = () => {
    closeDuelSocket();
    useDuelClockStore.getState().reset();
    stopRound();
    shiftEventTime(0);
    useTierPromotionStore.getState().reset();
    set(initialState);
  };

  const join = (duelId: string) => {
    leave();
    set({ duelId });
    openDuelSocket(duelId, {
      receive: (message) => dispatch({ kind: "message", message }),
      link: (link) => dispatch({ kind: "link", link }),
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
