import { t } from "elysia";

const duelParams = t.Object({ id: t.String({ format: "uuid" }) });
const notFound = t.Object({ code: t.Literal("DUEL_NOT_FOUND") });

export const RootPost = {
  Response: t.Object({ id: t.String() }),
};

export const IdGet = {
  Params: duelParams,
  Response: t.Object({
    participants: t.Array(
      t.Object({
        seat: t.Union([t.Literal(0), t.Literal(1)]),
        name: t.String(),
        connected: t.Boolean(),
      }),
    ),
  }),
  NotFound: notFound,
};

const at = t.Number();

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
  t.Object({ type: t.Literal("addWords"), words: t.Array(t.String()) }),
]);

export const IdSocket = {
  Params: duelParams,
  Body: t.Union([
    t.Object({ type: t.Literal("ping"), clientAt: t.Number() }),
    t.Object({ type: t.Literal("event"), event: gameEvent }),
  ]),
};
