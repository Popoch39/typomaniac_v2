import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import * as OrnamentModel from "./model.ts";
import { readOwnOrnament, saveOrnamentChoice } from "./service.ts";

export const createOrnamentRoutes = (db: Db, protection: Protection) =>
  new Elysia({ prefix: "/api/me/ornament" })
    .use(protection)
    .get("/", { nicknameChosen: true, response: OrnamentModel.RootGet.Response }, ({ player }) =>
      readOwnOrnament(db, player.id),
    )
    .put(
      "/",
      { nicknameChosen: true, body: OrnamentModel.RootPut.Body },
      async ({ player, body, status }) => {
        if ((await saveOrnamentChoice(db, player.id, body.choice)) === "locked")
          return status(403, { code: "ORNAMENT_LOCKED" });
        return readOwnOrnament(db, player.id);
      },
    );
