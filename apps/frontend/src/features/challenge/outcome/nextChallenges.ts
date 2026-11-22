import type {
  ChallengeRefusal,
  Challenger,
  PlayerServerMessage,
} from "../../online/message/parsePlayerMessage.ts";
import type { AnswerWindow } from "../clock/challengeClock.ts";

/** The Friend challenged, as their row on the Friends page names them. */
export type ChallengedFriend = { readonly id: string; readonly nickname: string };

/** A Challenge this tab received, waiting for the Player's answer. */
export type ReceivedChallenge = {
  readonly challengeId: string;
  readonly challenger: Challenger;
  readonly window: AnswerWindow;
  /** Whether the Player accepted it from this tab and waits for the Duel. */
  readonly isAccepting: boolean;
};

/** The Challenge this tab sent; its id and time unknown until the server confirms it. */
export type SentChallenge = {
  readonly friend: ChallengedFriend;
  readonly challengeId: string | null;
  readonly window: AnswerWindow | null;
};

/** What this tab shows of Challenges. */
export type Challenges = {
  readonly received: readonly ReceivedChallenge[];
  readonly sent: SentChallenge | null;
  /** What happened to the Challenge this tab sent, until dismissed. */
  readonly notice: string | null;
  /** The Custom Duel of an accepted Challenge, to be taken into. */
  readonly duelId: string | null;
};

export const NO_CHALLENGES: Challenges = { received: [], sent: null, notice: null, duelId: null };

const refusalNotice = (code: ChallengeRefusal, nickname: string) => {
  switch (code) {
    case "NOT_FRIENDS":
      return `${nickname} is no longer your Friend.`;
    case "FRIEND_OFFLINE":
      return `${nickname} is offline: they cannot be challenged now.`;
    case "FRIEND_BUSY":
      return `${nickname} is busy in a Duel: challenge them once it is over.`;
    case "IN_DUEL":
      return `You are in a Duel: finish it before challenging ${nickname}.`;
    case "CHALLENGE_PENDING":
      return `You already have a Challenge waiting. Cancel it to challenge ${nickname}.`;
    case "RATE_LIMITED":
      return "You are challenging too fast. Wait a moment, then try again.";
  }
};

/** The Player challenges the Friend from this tab, which waits for the server's word. */
export const challengeSending = (state: Challenges, friend: ChallengedFriend): Challenges => ({
  ...state,
  sent: { friend, challengeId: null, window: null },
  notice: null,
});

/** The Player withdrew their Challenge: it is gone at once, and its cancellation says nothing. */
export const withdrawnChallenge = (state: Challenges): Challenges => ({ ...state, sent: null });

/** The Player accepted the received Challenge from this tab, and waits for its Duel. */
export const acceptingChallenge = (state: Challenges, challengeId: string): Challenges => ({
  ...state,
  received: state.received.map((received) =>
    received.challengeId === challengeId ? { ...received, isAccepting: true } : received,
  ),
});

/** The received Challenge is no longer shown: answered, withdrawn or expired. */
export const answeredChallenge = (state: Challenges, challengeId: string): Challenges => ({
  ...state,
  received: state.received.filter((received) => received.challengeId !== challengeId),
});

/** The socket dropped: the server cancelled the Challenge this tab sent, which it can no longer hear. */
export const challengeDropped = (state: Challenges): Challenges =>
  state.sent === null
    ? state
    : {
        ...state,
        sent: null,
        notice: `Your Challenge to ${state.sent.friend.nickname} was cancelled: the connection dropped.`,
      };

/**
 * What this tab shows once the Player socket's message, received at `receivedAt` on the client's
 * clock, is taken into account. A message about a Challenge this tab neither sent nor holds, such as
 * one another tab of the challenger sent, changes nothing.
 */
export function nextChallenges(
  state: Challenges,
  message: PlayerServerMessage,
  receivedAt: number,
): Challenges {
  const { sent } = state;
  const isSending = (playerId: string) =>
    sent !== null && sent.challengeId === null && sent.friend.id === playerId;
  const isSent = (challengeId: string) => sent !== null && sent.challengeId === challengeId;
  const endSent = (notice: string): Challenges => ({ ...state, sent: null, notice });

  switch (message.type) {
    case "challengeSent":
      if (sent === null || !isSending(message.playerId)) return state;
      return {
        ...state,
        sent: {
          ...sent,
          challengeId: message.challengeId,
          window: { answerWithinMs: message.answerWithinMs, receivedAt },
        },
      };
    case "challengeRefused":
      if (sent === null || !isSending(message.playerId)) return state;
      return endSent(refusalNotice(message.code, sent.friend.nickname));
    case "challengeReceived":
      if (state.received.some(({ challengeId }) => challengeId === message.challengeId))
        return state;
      return {
        ...state,
        received: [
          ...state.received,
          {
            challengeId: message.challengeId,
            challenger: message.challenger,
            window: { answerWithinMs: message.answerWithinMs, receivedAt },
            isAccepting: false,
          },
        ],
      };
    case "challengeAccepted": {
      const isHeld = state.received.some(({ challengeId }) => challengeId === message.challengeId);
      if (!isSent(message.challengeId) && !isHeld) return state;
      return { ...NO_CHALLENGES, duelId: message.duelId };
    }
    case "challengeDeclined":
      if (sent === null || !isSent(message.challengeId)) return state;
      return endSent(`${sent.friend.nickname} declined your Challenge.`);
    case "challengeCancelled":
      if (sent !== null && isSent(message.challengeId))
        return endSent(`Your Challenge to ${sent.friend.nickname} was cancelled.`);
      return answeredChallenge(state, message.challengeId);
    case "challengeExpired":
      if (sent !== null && isSent(message.challengeId))
        return endSent(`${sent.friend.nickname} did not answer your Challenge in time.`);
      return answeredChallenge(state, message.challengeId);
    case "challengeAnsweredElsewhere":
      return answeredChallenge(state, message.challengeId);
    default:
      return state;
  }
}
