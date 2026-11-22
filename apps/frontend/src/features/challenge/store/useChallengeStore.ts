import { create } from "zustand";
import { clientTime } from "../../game/clock/clientTime.ts";
import type { PlayerServerMessage } from "../../online/message/parsePlayerMessage.ts";
import { sendToPlayerSocket } from "../../online/socket/playerSocket.ts";
import {
  acceptingChallenge,
  answeredChallenge,
  type ChallengedFriend,
  type Challenges,
  challengeDropped,
  challengeSending,
  NO_CHALLENGES,
  nextChallenges,
  withdrawnChallenge,
} from "../outcome/nextChallenges.ts";

type ChallengeState = Omit<Challenges, "duelId"> & {
  /** The client's clock, refreshed while a Challenge counts down, for its time left. */
  readonly now: number;
  readonly receive: (message: PlayerServerMessage) => void;
  readonly challenge: (friend: ChallengedFriend) => void;
  /** Withdraws the Challenge this tab sent. */
  readonly cancel: () => void;
  readonly accept: (challengeId: string) => void;
  readonly decline: (challengeId: string) => void;
  readonly dismiss: () => void;
  /** The Player socket dropped and is being reopened. */
  readonly drop: () => void;
  /** Forgets every Challenge: another Player, or no socket at all. */
  readonly reset: () => void;
};

const CLOCK_REFRESH_MS = 250;

// Owned by the store because components may not run effects.
let clockTimer: ReturnType<typeof setInterval> | null = null;
// Handed by the app's entry, since a store may not import the router.
let goToDuel: (duelId: string) => void = () => {};

/** How the store takes the Player into the Custom Duel of an accepted Challenge. */
export function setChallengeDuelNavigation(navigate: (duelId: string) => void) {
  goToDuel = navigate;
}

const initialState = { received: [], sent: null, notice: null } as const;

export const useChallengeStore = create<ChallengeState>()((set, get) => {
  const challenges = (): Challenges => ({ ...get(), duelId: null });
  // Applies the change, takes the Player into a Duel it names, and counts down while anything waits.
  const apply = ({ duelId, ...next }: Challenges) => {
    set({ ...next, now: clientTime() });
    if (duelId !== null) goToDuel(duelId);
    const isCounting = next.received.length > 0 || next.sent?.window != null;
    if (isCounting && clockTimer === null)
      clockTimer = setInterval(() => set({ now: clientTime() }), CLOCK_REFRESH_MS);
    if (!isCounting && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
  return {
    ...initialState,
    now: 0,
    receive: (message) => apply(nextChallenges(challenges(), message, clientTime())),
    challenge: (friend) => {
      if (get().sent !== null) return;
      sendToPlayerSocket({ type: "challenge", playerId: friend.id });
      apply(challengeSending(challenges(), friend));
    },
    cancel: () => {
      const challengeId = get().sent?.challengeId;
      if (challengeId == null) return;
      sendToPlayerSocket({ type: "cancelChallenge", challengeId });
      apply(withdrawnChallenge(challenges()));
    },
    accept: (challengeId) => {
      sendToPlayerSocket({ type: "acceptChallenge", challengeId });
      apply(acceptingChallenge(challenges(), challengeId));
    },
    decline: (challengeId) => {
      sendToPlayerSocket({ type: "declineChallenge", challengeId });
      apply(answeredChallenge(challenges(), challengeId));
    },
    dismiss: () => set({ notice: null }),
    drop: () => apply(challengeDropped(challenges())),
    reset: () => apply(NO_CHALLENGES),
  };
});
