import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import * as ProgressModel from "./model.ts";
import { readProgress } from "./service.ts";

// Public: anyone, a Guest or a visitor without any session, may read a Player's Progress.
export const createProgressRoutes = (db: Db, protection: Protection) =>
  new Elysia({ prefix: "/api/players" }).use(protection).get(
    "/:nickname/progress",
    {
      publicRead: true,
      params: ProgressModel.NicknameProgressGet.Params,
      query: ProgressModel.NicknameProgressGet.Query,
      response: ProgressModel.NicknameProgressGet.Response,
    },
    async ({ params, query, status }) => {
      const progress = await readProgress(db, params.nickname, {
        window: query.window ?? "20-duels",
        kind: query.kind ?? "all",
      });
      if (progress === null) return status(404, { code: "PLAYER_NOT_FOUND" });
      return progress;
    },
  );
