import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
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

export const createFriendRoutes = (db: Db, protection: Protection, rateLimiter: RateLimiter) =>
  new Elysia({ prefix: "/api/friends" })
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
          default:
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
        return (await deleteFriendRequest(db, { senderId: params.playerId, receiverId: player.id }))
          ? status(204, undefined)
          : status(404, { code: "REQUEST_NOT_FOUND" });
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
        return (await deleteFriendRequest(db, { senderId: player.id, receiverId: params.playerId }))
          ? status(204, undefined)
          : status(404, { code: "REQUEST_NOT_FOUND" });
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
        return (await removeFriend(db, player.id, params.playerId))
          ? status(204, undefined)
          : status(404, { code: "FRIEND_NOT_FOUND" });
      },
    );
