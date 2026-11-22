import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import type { Protection } from "../auth/index.ts";
import { pushToPlayer } from "../online/service.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import * as FriendModel from "./model.ts";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  readFriendRequests,
  readFriends,
  removeFriend,
  searchPlayers,
  sendFriendRequest,
} from "./service.ts";

type PairMessage = "friendRequestAccepted" | "friendRequestRemoved" | "friendRemoved";

export const createFriendRoutes = (
  db: Db,
  protection: Protection,
  rateLimiter: RateLimiter,
  redis: Redis,
) => {
  // Tells every tab of both Players, each naming the other, so that their pages follow the change.
  const pushToBoth = (type: PairMessage, playerId: string, otherId: string) =>
    Promise.all([
      pushToPlayer(redis, playerId, { type, playerId: otherId }),
      pushToPlayer(redis, otherId, { type, playerId }),
    ]);
  return new Elysia({ prefix: "/api/friends" })
    .use(protection)
    .get(
      "/",
      { nicknameChosen: true, response: FriendModel.Get.Response },
      async ({ player, set }) => {
        const refused = await rateLimiter.check("friendRead", player.id, set);
        if (refused) return refused;
        return { friends: await readFriends(db, player.id) };
      },
    )
    .get(
      "/search",
      {
        nicknameChosen: true,
        query: FriendModel.SearchGet.Query,
        response: FriendModel.SearchGet.Response,
      },
      async ({ player, query, set }) => {
        const refused = await rateLimiter.check("friendRead", player.id, set);
        if (refused) return refused;
        return { players: await searchPlayers(db, player.id, query.nickname) };
      },
    )
    .get(
      "/requests",
      { nicknameChosen: true, response: FriendModel.RequestsGet.Response },
      async ({ player, set }) => {
        const refused = await rateLimiter.check("friendRead", player.id, set);
        if (refused) return refused;
        return readFriendRequests(db, player.id);
      },
    )
    .post(
      "/requests",
      {
        nicknameChosen: true,
        body: FriendModel.RequestsPost.Body,
        response: FriendModel.RequestsPost.Response,
      },
      async ({ player, body, set, status }) => {
        const refused = await rateLimiter.check("friendRequest", player.id, set);
        if (refused) return refused;
        const result = await sendFriendRequest(db, {
          senderId: player.id,
          receiverId: body.playerId,
          at: new Date(),
        });
        switch (result) {
          case "self":
            return status(422, { code: "SELF" });
          case "playerNotFound":
            return status(404, { code: "PLAYER_NOT_FOUND" });
          case "alreadyFriends":
            return status(409, { code: "ALREADY_FRIENDS" });
          case "requestPending":
            return status(409, { code: "REQUEST_PENDING" });
          case "friendLimit":
            return status(409, { code: "FRIEND_LIMIT" });
          case "pendingLimit":
            return status(409, { code: "PENDING_LIMIT" });
          case "becameFriends":
            await pushToBoth("friendRequestAccepted", player.id, body.playerId);
            return { result };
          case "sent":
            await Promise.all([
              pushToPlayer(redis, body.playerId, {
                type: "friendRequestReceived",
                playerId: player.id,
              }),
              pushToPlayer(redis, player.id, {
                type: "friendRequestSent",
                playerId: body.playerId,
              }),
            ]);
            return { result };
        }
      },
    )
    .post(
      "/requests/:playerId/accept",
      {
        nicknameChosen: true,
        params: FriendModel.RequestsPlayerIdAcceptPost.Params,
        response: FriendModel.RequestsPlayerIdAcceptPost.Response,
      },
      async ({ player, params, set, status }) => {
        const refused = await rateLimiter.check("friendChange", player.id, set);
        if (refused) return refused;
        const accepted = await acceptFriendRequest(db, {
          receiverId: player.id,
          senderId: params.playerId,
          at: new Date(),
        });
        if (accepted === "notFound") return status(404, { code: "REQUEST_NOT_FOUND" });
        if (accepted === "friendLimit") return status(409, { code: "FRIEND_LIMIT" });
        await pushToBoth("friendRequestAccepted", player.id, params.playerId);
        return status(204, undefined);
      },
    )
    .post(
      "/requests/:playerId/decline",
      {
        nicknameChosen: true,
        params: FriendModel.RequestsPlayerIdDeclinePost.Params,
        response: FriendModel.RequestsPlayerIdDeclinePost.Response,
      },
      async ({ player, params, set, status }) => {
        const refused = await rateLimiter.check("friendChange", player.id, set);
        if (refused) return refused;
        if (!(await deleteFriendRequest(db, { senderId: params.playerId, receiverId: player.id })))
          return status(404, { code: "REQUEST_NOT_FOUND" });
        await pushToBoth("friendRequestRemoved", player.id, params.playerId);
        return status(204, undefined);
      },
    )
    .delete(
      "/requests/:playerId",
      {
        nicknameChosen: true,
        params: FriendModel.RequestsPlayerIdDelete.Params,
        response: FriendModel.RequestsPlayerIdDelete.Response,
      },
      async ({ player, params, set, status }) => {
        const refused = await rateLimiter.check("friendChange", player.id, set);
        if (refused) return refused;
        if (!(await deleteFriendRequest(db, { senderId: player.id, receiverId: params.playerId })))
          return status(404, { code: "REQUEST_NOT_FOUND" });
        await pushToBoth("friendRequestRemoved", player.id, params.playerId);
        return status(204, undefined);
      },
    )
    .delete(
      "/:playerId",
      {
        nicknameChosen: true,
        params: FriendModel.PlayerIdDelete.Params,
        response: FriendModel.PlayerIdDelete.Response,
      },
      async ({ player, params, set, status }) => {
        const refused = await rateLimiter.check("friendChange", player.id, set);
        if (refused) return refused;
        if (!(await removeFriend(db, player.id, params.playerId)))
          return status(404, { code: "FRIEND_NOT_FOUND" });
        await pushToBoth("friendRemoved", player.id, params.playerId);
        return status(204, undefined);
      },
    );
};
