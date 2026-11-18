import { t } from "elysia";
import type { TSchema } from "typebox";

const duelParams = t.Object({ id: t.String({ format: "uuid" }) });
const notFound = t.Object({ code: t.Literal("DUEL_NOT_FOUND") });

export const RootPost = {
  Response: t.Object({ id: t.String() }),
};

const seat = t.Union([t.Literal(0), t.Literal(1)]);
const participant = t.Object({ seat, name: t.String(), connected: t.Boolean() });

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
        words: t.Union([list(t.String()), t.Null()]),
        participants: list(participant),
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
      t.Object({ type: t.Literal("end"), results: pair(result), outcomes: pair(outcome) }),
    ]),
    404: notFound,
    409: t.Object({ code: t.Literal("DUEL_FULL") }),
    426: t.Object({ code: t.Literal("UPGRADE_REQUIRED") }),
  },
};
