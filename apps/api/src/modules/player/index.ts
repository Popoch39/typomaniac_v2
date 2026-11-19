import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import { readWornOrnaments } from "../ornament/service.ts";
import * as PlayerModel from "./model.ts";
import { isReservedNickname, saveNickname } from "./service.ts";

export const createPlayerRoutes = (db: Db, auth: Auth) =>
  new Elysia({ prefix: "/api/me" })
    .use(createProtection(auth))
    .get("/", { signedIn: true }, async ({ player }) => ({
      id: player.id,
      nickname: player.nickname ?? null,
      // The picture Better Auth stored from the provider at creation, loaded straight from its CDN.
      avatarUrl: player.image ?? null,
      ornament: (await readWornOrnaments(db, [player.id])).get(player.id) ?? null,
    }))
    .put(
      "/nickname",
      { signedIn: true, body: PlayerModel.NicknamePut.Body },
      async ({ player, body, status }) => {
        if (isReservedNickname(body.nickname)) return status(422, { code: "NICKNAME_RESERVED" });
        if ((await saveNickname(db, player.id, body.nickname)) === "taken")
          return status(409, { code: "NICKNAME_TAKEN" });
        return { id: player.id, nickname: body.nickname };
      },
    );
