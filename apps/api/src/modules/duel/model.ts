import { t } from "elysia";
import type { TSchema } from "typebox";

const duelParams = t.Object({ id: t.String({ format: "uuid" }) });
const notFound = t.Object({ code: t.Literal("DUEL_NOT_FOUND") });

export const RootPost = {
  Response: t.Object({ id: t.String() }),
};

const seat = t.Union([t.Literal(0), t.Literal(1)]);
const participant = t.Object({
  seat,
  name: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
  // The Ornament `wornOrnament` gives, `null` for a bare Avatar.
  ornament: t.Union([
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
  ]),
  connected: t.Boolean(),
});

export const IdGet = {
  Params: duelParams,
  Response: {
    200: t.Object({ participants: t.Array(participant) }),
    404: notFound,
  },
};

// Read-only, as the messages of `@repo/duel-engine` the server sends through these schemas.
const list = <Item extends TSchema>(item: Item) => t.Immutable(t.Array(item));
const pair = <Item extends TSchema>(item: Item) => t.Immutable(t.Tuple([item, item]));

const at = t.Number();
// Rounds are numbered from 1.
const round = t.Integer({ minimum: 1 });

const gameEvent = t.Union([
  t.Object({ type: t.Literal("start"), at }),
  t.Object({ type: t.Literal("keyDown"), at, code: t.String() }),
  t.Object({ type: t.Literal("keyUp"), at, code: t.String() }),
  t.Object({ type: t.Literal("insert"), at, text: t.String() }),
  t.Object({
    type: t.Literal("delete"),
    at,
    unit: t.Union([t.Literal("char"), t.Literal("word")]),
  }),
  t.Object({ type: t.Literal("tick"), at }),
  t.Object({ type: t.Literal("addWords"), words: list(t.String()) }),
]);

const numbers = list(t.Number());

// Every field of the Result: one left out would be stripped from the end sent to the client.
const result = t.Object({
  duration: t.Number(),
  wpm: t.Number(),
  rawWpm: t.Number(),
  accuracy: t.Number(),
  charCounts: t.Object({
    correct: t.Number(),
    incorrect: t.Number(),
    extra: t.Number(),
    missed: t.Number(),
    exactWords: t.Number(),
  }),
  consistency: t.Number(),
  history: t.Object({ wpm: numbers, keystrokeRate: numbers, errors: numbers }),
  keyPressGaps: numbers,
  keyHoldDurations: numbers,
  keyConsistency: t.Number(),
  inactiveSeconds: t.Number(),
  inactiveAtEnd: t.Boolean(),
});

const outcome = t.Union([t.Literal("win"), t.Literal("loss"), t.Literal("draw")]);

const finishedRound = { results: pair(result), outcomes: pair(outcome) };

const lp = t.Integer();

// The shape the `standing` module answers with, written again since a model is not imported across
// modules. `null` for an Unranked Player.
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

// Every field a Player may see of what a ranked Duel did to a Standing. The MMR is hidden (ADR
// 0006): left out here, it is stripped from whatever the end carries.
const rankedEnd = t.Object({
  lpDelta: lp,
  rankChange: t.Union([
    t.Literal("placed"),
    t.Literal("promoted"),
    t.Literal("demoted"),
    t.Literal("none"),
  ]),
  rank,
  placement: t.Object({ played: t.Integer(), total: t.Integer() }),
});

export const IdSocket = {
  Params: duelParams,
  Body: t.Union([
    t.Object({ type: t.Literal("ping"), clientAt: t.Number() }),
    t.Object({ type: t.Literal("event"), round, event: gameEvent }),
  ]),
  Response: {
    // What the socket sends once open; the other statuses refuse the upgrade.
    200: t.Union([
      t.Object({ type: t.Literal("pong"), clientAt: t.Number(), serverAt: t.Number() }),
      t.Object({
        type: t.Literal("state"),
        seat,
        round,
        rounds: list(t.Object(finishedRound)),
        startAt: t.Union([t.Number(), t.Null()]),
        words: t.Union([list(t.String()), t.Null()]),
        participants: list(participant),
        ranks: t.Union([pair(rank), t.Null()]),
        journals: pair(list(gameEvent)),
      }),
      t.Object({ type: t.Literal("presence"), participant }),
      t.Object({
        type: t.Literal("countdown"),
        round,
        startAt: t.Number(),
        words: list(t.String()),
      }),
      t.Object({ type: t.Literal("opponentEvent"), event: gameEvent }),
      t.Object({
        type: t.Literal("roundEnd"),
        round,
        ...finishedRound,
        nextStartAt: t.Union([t.Number(), t.Null()]),
      }),
      t.Object({
        type: t.Literal("end"),
        outcomes: pair(outcome),
        rounds: list(t.Object(finishedRound)),
        ranked: t.Union([pair(rankedEnd), t.Null()]),
      }),
    ]),
    404: notFound,
    409: t.Object({ code: t.Literal("DUEL_FULL") }),
    426: t.Object({ code: t.Literal("UPGRADE_REQUIRED") }),
  },
};
