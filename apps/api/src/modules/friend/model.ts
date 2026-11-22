import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";
import { LEADERBOARD_PAGE_SIZE, PODIUM_SIZE } from "../standing/service.ts";

const tier = t.Union([
  t.Literal("bronze"),
  t.Literal("silver"),
  t.Literal("gold"),
  t.Literal("platinum"),
  t.Literal("diamond"),
]);

const division = t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]);

const lp = t.Integer();

const rank = t.Union([
  t.Object({ tier, division, lp }),
  t.Object({ tier: t.Literal("master"), lp }),
]);

// Written again from the `ornament` module since a model is not imported across modules. `null` for
// a bare Avatar; the Division only in Auto, below Master.
const ornament = t.Nullable(
  t.Object({
    tier: t.Union([t.Literal("unranked"), ...tier.anyOf, t.Literal("master")]),
    division: t.Nullable(division),
  }),
);

// Another Player as a Friend, a Friend request or a search result shows them, with their id, which
// the Friend routes take. Never their MMR (ADR 0006).
const playerIdParams = t.Object({ playerId: t.String() });

const RequestNotFound = t.Object({ code: t.Literal("REQUEST_NOT_FOUND") });

const relation = t.Union([
  t.Literal("friend"),
  t.Literal("requestSent"),
  t.Literal("requestReceived"),
  t.Literal("none"),
]);

const listedPlayer = t.Object({
  id: t.String(),
  nickname: t.String(),
  avatarUrl: t.Nullable(t.String()),
  // Null while Unranked.
  rank: t.Nullable(rank),
  ornament,
});

export const Get = {
  Response: {
    // By Nickname.
    200: t.Object({ friends: t.Array(listedPlayer) }),
    429: RateLimited,
  },
};

export const SearchGet = {
  Query: t.Object({
    // The start of a Nickname: from 2 characters, and only what a Nickname may hold.
    nickname: t.String({
      minLength: 2,
      maxLength: 20,
      pattern: "^[A-Za-z0-9_-]+$",
      error: () => ({ code: "SEARCH_INVALID" }),
    }),
  }),
  Response: {
    // At most 10, by Nickname.
    200: t.Object({
      players: t.Array(
        t.Object({
          ...listedPlayer.properties,
          // What links the requester to this Player.
          relation,
        }),
      ),
    }),
    422: t.Object({ code: t.Literal("SEARCH_INVALID") }),
    429: RateLimited,
  },
};

// Everyone one read of the Leaderboard lists besides the reader: the Podium, a page, and the two
// Players around the reader.
const MAX_LOOKED_UP = PODIUM_SIZE + LEADERBOARD_PAGE_SIZE + 2;

const relationsInvalid = () => ({ code: "RELATIONS_INVALID" });

// Looked up by Nickname, as the public pages, the Leaderboard and a Duel name a Player, never by id.
export const RelationsGet = {
  Query: t.Object({
    nicknames: t.Array(
      t.String({ maxLength: 20, pattern: "^[A-Za-z0-9_-]+$", error: relationsInvalid }),
      { minItems: 1, maxItems: MAX_LOOKED_UP, error: relationsInvalid },
    ),
  }),
  Response: {
    // In the order asked, without the requester, banned Players and Nicknames nobody holds.
    200: t.Object({
      players: t.Array(t.Object({ id: t.String(), nickname: t.String(), relation })),
    }),
    422: t.Object({ code: t.Literal("RELATIONS_INVALID") }),
    429: RateLimited,
  },
};

// The Players of the Leaderboard page the requester reads, found by the server: the page after the
// Podium and, when the requester is off it, the Players around them, as the page's table lists them.
export const RelationsLeaderboardGet = {
  Query: t.Object({
    // 1 when left out; a page past the last one is that of the last page, as the Leaderboard serves it.
    page: t.Optional(t.Integer({ minimum: 1 })),
  }),
  Response: {
    // In the order of the table, without the requester and banned Players.
    200: RelationsGet.Response[200],
    429: RateLimited,
  },
};

export const RequestsGet = {
  Response: {
    200: t.Object({
      // Newest first, both.
      received: t.Array(listedPlayer),
      sent: t.Array(listedPlayer),
    }),
    429: RateLimited,
  },
};

export const RequestsPost = {
  Body: t.Object({ playerId: t.String() }),
  Response: {
    // `becameFriends` when the other Player had already sent one: the two requests make a Friendship.
    200: t.Object({ result: t.Union([t.Literal("sent"), t.Literal("becameFriends")]) }),
    // Also for a banned Player and one without a Nickname, who cannot appear publicly.
    404: t.Object({ code: t.Literal("PLAYER_NOT_FOUND") }),
    409: t.Object({
      code: t.Union([
        t.Literal("ALREADY_FRIENDS"),
        t.Literal("REQUEST_PENDING"),
        // Either Player has as many Friends as allowed.
        t.Literal("FRIEND_LIMIT"),
        // The sender has as many sent requests waiting as allowed.
        t.Literal("PENDING_LIMIT"),
      ]),
    }),
    422: t.Object({ code: t.Literal("SELF") }),
    429: RateLimited,
  },
};

// Accepts the request the Player in the path sent.
export const RequestsPlayerIdAcceptPost = {
  Params: playerIdParams,
  Response: {
    204: t.Void(),
    404: RequestNotFound,
    // Either Player has as many Friends as allowed; the request keeps waiting.
    409: t.Object({ code: t.Literal("FRIEND_LIMIT") }),
    429: RateLimited,
  },
};

// Declines the request the Player in the path sent; they are not told.
export const RequestsPlayerIdDeclinePost = {
  Params: playerIdParams,
  Response: { 204: t.Void(), 404: RequestNotFound, 429: RateLimited },
};

// Cancels the request sent to the Player in the path.
export const RequestsPlayerIdDelete = {
  Params: playerIdParams,
  Response: { 204: t.Void(), 404: RequestNotFound, 429: RateLimited },
};

// Ends the Friendship with the Player in the path; they are not told.
export const PlayerIdDelete = {
  Params: playerIdParams,
  Response: {
    204: t.Void(),
    404: t.Object({ code: t.Literal("FRIEND_NOT_FOUND") }),
    429: RateLimited,
  },
};
