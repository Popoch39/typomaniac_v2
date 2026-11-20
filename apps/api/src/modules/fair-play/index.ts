import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import * as FairPlayModel from "./model.ts";
import { readOwnVoidedDuels } from "./service.ts";

export const createFairPlayRoutes = (db: Db, protection: Protection) =>
  new Elysia({ prefix: "/api" })
    .use(protection)
    .get(
      "/me/fair-play",
      { signedIn: true, response: FairPlayModel.MeFairPlayGet.Response },
      async ({ player }) => ({ voidedDuels: await readOwnVoidedDuels(db, player.id) }),
    );
