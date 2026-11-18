import { t } from "elysia";

export const RootGet = {
  Response: {
    // The instant the Player entered the Queue, `null` when they are not queued.
    200: t.Object({ queuedAt: t.Union([t.Number(), t.Null()]) }),
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
      }),
      t.Object({ type: t.Literal("requeued"), queuedAt: t.Number(), serverAt: t.Number() }),
      t.Object({
        type: t.Literal("removed"),
        reason: t.Union([t.Literal("replaced"), t.Literal("notAccepted")]),
      }),
      t.Object({ type: t.Literal("paired"), duelId: t.String() }),
    ]),
  },
};
