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

export const IdSocket = {
  Params: duelParams,
};
