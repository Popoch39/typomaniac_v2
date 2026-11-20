import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import * as ProgressModel from "./model.ts";
import { readPublicPlayer } from "./service.ts";

// Public: anyone, a Guest or a visitor without any session, may read a Player's page.
export const createProgressRoutes = (db: Db, protection: Protection, rateLimiter: RateLimiter) =>
  new Elysia({ prefix: "/api/players" }).use(protection).get(
    "/:nickname",
    {
      requester: true,
      params: ProgressModel.NicknameGet.Params,
      response: ProgressModel.NicknameGet.Response,
    },
    async ({ params, requesterId, request, server, set, status }) => {
      const refused = await rateLimiter.check(
        "progress",
        requesterId ?? rateLimiter.clientIp(request, server),
        set,
      );
      if (refused) return refused;
      const player = await readPublicPlayer(db, params.nickname);
      if (player === null) return status(404, { code: "PLAYER_NOT_FOUND" });
      return player;
    },
  );
