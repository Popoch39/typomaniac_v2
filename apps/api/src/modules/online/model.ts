import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

// What a Friend's Friends see of them: Online, seated in an unfinished Duel, or offline.
const friendState = t.Union([t.Literal("online"), t.Literal("inDuel"), t.Literal("offline")]);

const aboutPlayer = <Type extends string>(type: Type) =>
  t.Object({ type: t.Literal(type), playerId: t.String() });

const aboutChallenge = <Type extends string>(type: Type) =>
  t.Object({ type: t.Literal(type), challengeId: t.String() });

const tier = t.Union([
  t.Literal("bronze"),
  t.Literal("silver"),
  t.Literal("gold"),
  t.Literal("platinum"),
  t.Literal("diamond"),
]);

const division = t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]);

// Written again from the `friend` module since a model is not imported across modules: a challenger
// as the Leaderboard shows them, null while Unranked or with a bare Avatar. Never their MMR (ADR 0006).
const challenger = t.Object({
  id: t.String(),
  nickname: t.String(),
  avatarUrl: t.Nullable(t.String()),
  rank: t.Nullable(
    t.Union([
      t.Object({ tier, division, lp: t.Integer() }),
      t.Object({ tier: t.Literal("master"), lp: t.Integer() }),
    ]),
  ),
  ornament: t.Nullable(
    t.Object({
      tier: t.Union([t.Literal("unranked"), ...tier.anyOf, t.Literal("master")]),
      division: t.Nullable(division),
    }),
  ),
});

/** Why a Challenge was not sent. */
export const ChallengeRefusal = t.Union([
  t.Literal("NOT_FRIENDS"),
  t.Literal("FRIEND_OFFLINE"),
  t.Literal("CHALLENGE_PENDING"),
  t.Literal("RATE_LIMITED"),
]);

export const Socket = {
  // What a tab sends, each about a Challenge.
  Body: t.Union([
    // Challenges the Friend named, from this tab.
    t.Object({ type: t.Literal("challenge"), playerId: t.String() }),
    // Withdraws this Player's waiting Challenge.
    aboutChallenge("cancelChallenge"),
    aboutChallenge("acceptChallenge"),
    aboutChallenge("declineChallenge"),
  ]),
  Response: {
    // What the Player socket sends. A field left out here would be stripped from the message.
    200: t.Union([
      t.Object({ type: t.Literal("onlineCount"), count: t.Integer({ minimum: 0 }) }),
      // Every Friend's state, first thing on a socket of a Player with a Nickname.
      t.Object({
        type: t.Literal("friendStates"),
        friends: t.Array(t.Object({ playerId: t.String(), state: friendState })),
      }),
      t.Object({ type: t.Literal("friendState"), playerId: t.String(), state: friendState }),
      // The Player named sent this Player a Friend request.
      aboutPlayer("friendRequestReceived"),
      // This Player sent the Player named a Friend request, from this tab or another one.
      aboutPlayer("friendRequestSent"),
      // This Player and the Player named became Friends, whichever of them accepted.
      aboutPlayer("friendRequestAccepted"),
      // The Friend request between this Player and the Player named was declined or cancelled.
      aboutPlayer("friendRequestRemoved"),
      // This Player and the Player named are no longer Friends, whichever of them removed the other.
      aboutPlayer("friendRemoved"),
      // To the tab that challenged: the Challenge waits for the Friend named, for that long.
      t.Object({
        type: t.Literal("challengeSent"),
        challengeId: t.String(),
        playerId: t.String(),
        answerWithinMs: t.Integer({ minimum: 0 }),
      }),
      // To the tab that challenged: the Challenge to the Friend named was not sent.
      t.Object({
        type: t.Literal("challengeRefused"),
        playerId: t.String(),
        code: ChallengeRefusal,
      }),
      // To every tab of the challenged Player, to answer within that long.
      t.Object({
        type: t.Literal("challengeReceived"),
        challengeId: t.String(),
        challenger,
        answerWithinMs: t.Integer({ minimum: 0 }),
      }),
      // To the challenger's tabs and the tab that accepted: both are to join this Custom Duel.
      t.Object({
        type: t.Literal("challengeAccepted"),
        challengeId: t.String(),
        duelId: t.String(),
      }),
      // To the challenger's tabs: the Friend named declined.
      t.Object({
        type: t.Literal("challengeDeclined"),
        challengeId: t.String(),
        playerId: t.String(),
      }),
      // To a challenged Player's tab: another of their tabs answered first.
      aboutChallenge("challengeAnsweredElsewhere"),
      // To both Players: withdrawn by the challenger, or either went offline or ended the Friendship.
      aboutChallenge("challengeCancelled"),
      // To both Players: nobody answered in time.
      aboutChallenge("challengeExpired"),
    ]),
    // The other statuses refuse the upgrade.
    429: RateLimited,
  },
};
