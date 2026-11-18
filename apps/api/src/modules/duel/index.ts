import type { Participant, ServerMessage } from "@repo/duel-engine";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Redis } from "../../redis/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import * as DuelModel from "./model.ts";
import { createRelay } from "./relay.ts";
import { claimSeat, createDuel, DUEL_EXPIRY_MS, readDuel, releaseSeat } from "./service.ts";

export type DuelOptions = { readonly expiryMs?: number };

export const createDuelRoutes = (
  auth: Auth,
  redis: Redis,
  { expiryMs = DUEL_EXPIRY_MS }: DuelOptions = {},
) => {
  const relay = createRelay(redis);
  // What each open socket is seated as, set on open and read on close.
  const seated = new Map<
    string,
    { participant: Participant; delivery: Parameters<typeof relay.join>[1] }
  >();

  return (
    new Elysia({ prefix: "/api/duels" })
      .use(createProtection(auth))
      .use(websocket())
      .post(
        "/",
        { nicknameChosen: true, response: { 201: DuelModel.RootPost.Response } },
        async ({ status }) => status(201, { id: await createDuel(redis, expiryMs) }),
      )
      // Lets a client tell why its upgrade was refused, which a browser WebSocket never shows.
      .get(
        "/:id",
        {
          nicknameChosen: true,
          params: DuelModel.IdGet.Params,
          response: { 200: DuelModel.IdGet.Response, 404: DuelModel.IdGet.NotFound },
        },
        async ({ params, status }) => {
          const duel = await readDuel(redis, params.id);
          if (!duel) return status(404, { code: "DUEL_NOT_FOUND" });
          return { participants: [...duel.participants] };
        },
      )
      .ws("/:id/socket", {
        nicknameChosen: true,
        params: DuelModel.IdSocket.Params,
        async beforeHandle({ params, player, request, status }) {
          // A plain request must not claim a seat it could never use.
          if (request.headers.get("upgrade")?.toLowerCase() !== "websocket")
            return status(426, { code: "UPGRADE_REQUIRED" });
          const claimed = await claimSeat(redis, params.id, {
            id: player.id,
            name: player.nickname,
          });
          if (claimed === "unknown") return status(404, { code: "DUEL_NOT_FOUND" });
          if (claimed === "full") return status(409, { code: "DUEL_FULL" });
          if (claimed === "seated") return status(409, { code: "ALREADY_SEATED" });
        },
        async open(ws) {
          const duel = await readDuel(redis, ws.params.id);
          const seat = duel?.holderIds.indexOf(ws.player.id);
          const self = duel?.participants.find((participant) => participant.seat === seat);
          // Only when the Duel expired between the claim and the opening.
          if (!duel || !self) return ws.close();
          const send = (message: ServerMessage) => ws.send(JSON.stringify(message));
          const delivery = { seat: self.seat, send };
          seated.set(ws.id, { participant: self, delivery });
          await relay.join(ws.params.id, delivery);
          send({
            type: "state",
            seat: self.seat,
            words: duel.words,
            participants: duel.participants,
            journals: [[], []],
          });
          await relay.publish(ws.params.id, self.seat, { type: "presence", participant: self });
        },
        async close(ws) {
          const seat = seated.get(ws.id);
          if (!seat) return;
          seated.delete(ws.id);
          const { participant, delivery } = seat;
          await relay.leave(ws.params.id, delivery);
          await releaseSeat(redis, ws.params.id, participant.seat);
          await relay.publish(ws.params.id, participant.seat, {
            type: "presence",
            participant: { ...participant, connected: false },
          });
        },
      })
  );
};
