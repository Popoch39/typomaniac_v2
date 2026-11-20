import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { FairPlayConfig } from "./config.ts";
import * as FairPlayModel from "./model.ts";
import {
  readCurrentSuspension,
  readOpenReviews,
  readOwnVoidedDuels,
  readReview,
  settleReview,
} from "./service.ts";

export const createFairPlayRoutes = (
  db: Db,
  protection: Protection,
  { appealAddress }: FairPlayConfig,
) =>
  new Elysia({ prefix: "/api" })
    .use(protection)
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
    )
    .post(
      "/admin/reviews/:id/settlement",
      {
        administrator: true,
        params: FairPlayModel.AdminReviewsIdSettlementPost.Params,
        body: FairPlayModel.AdminReviewsIdSettlementPost.Body,
        response: FairPlayModel.AdminReviewsIdSettlementPost.Response,
      },
      async ({ params, body, status }) => {
        const settled = await settleReview(db, {
          reviewId: params.id,
          settlement: body,
          at: new Date(),
        });
        if (settled === "not-found") return status(404, { code: "REVIEW_NOT_FOUND" });
        if (settled === "duel-not-found") return status(404, { code: "DUEL_NOT_FOUND" });
        if (settled === "already-settled") return status(409, { code: "REVIEW_ALREADY_SETTLED" });
        return status(204, undefined);
      },
    );
