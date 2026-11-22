import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

// The Player has a ranked Duel to finish first, the one named.
const rankedDuelUnfinished = t.Object({
  code: t.Literal("RANKED_DUEL_UNFINISHED"),
  duelId: t.String(),
});

// The Player is suspended from ranked play until `endsAt`, in epoch milliseconds; never why. Or their
// GitHub or Discord account is too young for ranked: it opens at `opensAt`. Or its age is not recorded
// yet, and signing in again records it.
// The protection's own refusal of a Player without a Nickname shares the status, so it is listed too.
const forbidden = t.Union([
  t.Object({ code: t.Literal("RANKED_SUSPENDED"), endsAt: t.Number() }),
  t.Object({ code: t.Literal("ACCOUNT_TOO_YOUNG"), opensAt: t.Number() }),
  t.Object({ code: t.Literal("ACCOUNT_AGE_UNKNOWN") }),
  t.Object({ code: t.Literal("NICKNAME_REQUIRED") }),
]);

const lp = t.Integer();

// The shapes the `standing` and `ornament` modules answer with, written again since a model is not
// imported across modules. `null` for an Unranked Player.
const rank = t.Union([
  t.Object({
    tier: t.Union([
      t.Literal("bronze"),
      t.Literal("silver"),
      t.Literal("gold"),
      t.Literal("platinum"),
      t.Literal("diamond"),
    ]),
    division: t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]),
    lp,
  }),
  t.Object({ tier: t.Literal("master"), lp }),
  t.Null(),
]);

// `null` for a bare Avatar.
const ornament = t.Union([
  t.Object({
    tier: t.Union([
      t.Literal("unranked"),
      t.Literal("bronze"),
      t.Literal("silver"),
      t.Literal("gold"),
      t.Literal("platinum"),
      t.Literal("diamond"),
      t.Literal("master"),
    ]),
    division: t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4), t.Null()]),
  }),
  t.Null(),
]);

const pairingSide = t.Object({
  nickname: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
  rank,
  ornament,
});

export const RootGet = {
  Response: {
    // The instant the Player entered the Queue, `null` when they are not queued.
    200: t.Object({ queuedAt: t.Union([t.Number(), t.Null()]) }),
    403: forbidden,
    409: rankedDuelUnfinished,
  },
};

export const Socket = {
  Body: t.Object({ type: t.Literal("accept"), pairingId: t.String() }),
  Response: {
    // What the socket sends once open, as `QueueServerMessage` of `@repo/matchmaking-engine`. A
    // field left out here would be stripped from the message.
    200: t.Union([
      t.Object({ type: t.Literal("queued"), queuedAt: t.Number(), serverAt: t.Number() }),
      t.Object({
        type: t.Literal("proposed"),
        pairingId: t.String(),
        acceptWithinMs: t.Number(),
        accepted: t.Boolean(),
        players: t.Object({ self: pairingSide, opponent: pairingSide }),
      }),
      t.Object({ type: t.Literal("requeued"), queuedAt: t.Number(), serverAt: t.Number() }),
      t.Object({
        type: t.Literal("removed"),
        reason: t.Union([t.Literal("replaced"), t.Literal("notAccepted")]),
      }),
      t.Object({ type: t.Literal("paired"), duelId: t.String() }),
    ]),
    // The other statuses refuse the upgrade.
    403: forbidden,
    409: rankedDuelUnfinished,
    429: RateLimited,
  },
};
