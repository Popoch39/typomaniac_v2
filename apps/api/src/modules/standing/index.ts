import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import * as StandingModel from "./model.ts";
import { readStanding, visibleStanding } from "./service.ts";

export const createStandingRoutes = (db: Db, auth: Auth) =>
  new Elysia({ prefix: "/api/me/standing" })
    .use(createProtection(auth))
    .get("/", { signedIn: true, response: StandingModel.RootGet.Response }, async ({ player }) =>
      visibleStanding(await readStanding(db, player.id)),
    );
