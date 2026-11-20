import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import * as ReportModel from "./model.ts";
import { makeReport } from "./service.ts";

export const createReportRoutes = (db: Db, protection: Protection, rateLimiter: RateLimiter) =>
  new Elysia({ prefix: "/api/duels" }).use(protection).post(
    "/:id/report",
    {
      signedIn: true,
      params: ReportModel.IdReportPost.Params,
      response: ReportModel.IdReportPost.Response,
    },
    async ({ player, params, set, status }) => {
      const refused = await rateLimiter.check("report", player.id, set);
      if (refused) return refused;
      const made = await makeReport(db, {
        duelId: params.id,
        playerId: player.id,
        at: new Date(),
      });
      if (made === "not_found") return status(404, { code: "DUEL_NOT_FOUND" });
      if (made === "already_made") return status(409, { code: "REPORT_ALREADY_MADE" });
      return status(204, undefined);
    },
  );
