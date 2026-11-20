import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import type { FairPlayConfig } from "./config.ts";
import * as FairPlayModel from "./model.ts";
import {
  makeReport,
  readCurrentSuspension,
  readOpenReviews,
  readOwnVoidedDuels,
  readReview,
} from "./service.ts";

export const createFairPlayRoutes = (
  db: Db,
  protection: Protection,
  rateLimiter: RateLimiter,
  { appealAddress }: FairPlayConfig,
) =>
  new Elysia({ prefix: "/api" })
    .use(protection)
    .post(
      "/duels/:id/report",
      {
        signedIn: true,
        params: FairPlayModel.DuelsIdReportPost.Params,
        response: FairPlayModel.DuelsIdReportPost.Response,
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
    )
    .get(
      "/me/fair-play",
      { signedIn: true, response: FairPlayModel.MeFairPlayGet.Response },
      async ({ player }) => {
        const [voidedDuels, suspension] = await Promise.all([
          readOwnVoidedDuels(db, player.id),
          readCurrentSuspension(db, player.id, new Date()),
        ]);
        return { voidedDuels, suspension: suspension && { ...suspension, appealAddress } };
      },
    )
    .get(
      "/admin/reviews",
      { administrator: true, response: FairPlayModel.AdminReviewsGet.Response },
      () => readOpenReviews(db),
    )
    .get(
      "/admin/reviews/:id",
      {
        administrator: true,
        params: FairPlayModel.AdminReviewsIdGet.Params,
        response: FairPlayModel.AdminReviewsIdGet.Response,
      },
      async ({ params, status }) =>
        (await readReview(db, params.id)) ?? status(404, { code: "REVIEW_NOT_FOUND" }),
    );
