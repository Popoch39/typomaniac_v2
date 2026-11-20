import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import { readWornOrnaments } from "../ornament/service.ts";
import * as PlayerModel from "./model.ts";
import { isReservedNickname, readPublicPlayer, saveNickname } from "./service.ts";

export const createPlayerRoutes = (db: Db, protection: Protection, rateLimiter: RateLimiter) =>
  new Elysia({ prefix: "/api" })
    .use(protection)
    .get("/me", { signedIn: true }, async ({ player }) => ({
      id: player.id,
      nickname: player.nickname ?? null,
      // The picture Better Auth stored from the provider at creation, loaded straight from its CDN.
      avatarUrl: player.image ?? null,
      ornament: (await readWornOrnaments(db, [player.id])).get(player.id) ?? null,
    }))
    .put(
      "/me/nickname",
      { signedIn: true, body: PlayerModel.MeNicknamePut.Body },
      async ({ player, body, status, set }) => {
        const refused = await rateLimiter.check("nickname", player.id, set);
        if (refused) return refused;
        if (isReservedNickname(body.nickname)) return status(422, { code: "NICKNAME_RESERVED" });
        if ((await saveNickname(db, player.id, body.nickname)) === "taken")
          return status(409, { code: "NICKNAME_TAKEN" });
        return { id: player.id, nickname: body.nickname };
      },
    )
    // Public: anyone, a Guest or a visitor without any session, may read a Player's page.
    .get(
      "/players/:nickname",
      {
        publicRead: true,
        params: PlayerModel.PlayersNicknameGet.Params,
        response: PlayerModel.PlayersNicknameGet.Response,
      },
      async ({ params, status }) => {
        const player = await readPublicPlayer(db, params.nickname);
        if (player === null) return status(404, { code: "PLAYER_NOT_FOUND" });
        return player;
      },
    );
