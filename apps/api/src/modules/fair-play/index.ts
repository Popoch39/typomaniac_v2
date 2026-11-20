import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { FairPlayConfig } from "./config.ts";
import * as FairPlayModel from "./model.ts";
import { readCurrentSuspension, readOwnVoidedDuels } from "./service.ts";

export const createFairPlayRoutes = (
  db: Db,
  protection: Protection,
  { appealAddress }: FairPlayConfig,
) =>
  new Elysia({ prefix: "/api/me/fair-play" })
    .use(protection)
    .get("/", { signedIn: true, response: FairPlayModel.RootGet.Response }, async ({ player }) => {
      const [voidedDuels, suspension] = await Promise.all([
        readOwnVoidedDuels(db, player.id),
        readCurrentSuspension(db, player.id, new Date()),
      ]);
      return {
        voidedDuels: voidedDuels.map(({ sanctioned, ...voided }) => ({
          ...voided,
          appealAddress: sanctioned ? appealAddress : null,
        })),
        suspension: suspension && { ...suspension, appealAddress },
      };
    });
