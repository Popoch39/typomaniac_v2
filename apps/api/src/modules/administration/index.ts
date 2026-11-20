import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import { revokeSanction, settleReview } from "../fair-play/service.ts";
import * as AdministrationModel from "./model.ts";
import { readOpenReviews, readPlayerSanctions, readReview } from "./service.ts";

export const createAdministrationRoutes = (db: Db, protection: Protection) =>
  new Elysia({ prefix: "/api/admin" })
    .use(protection)
    .get(
      "/reviews",
      { administrator: true, response: AdministrationModel.ReviewsGet.Response },
      () => readOpenReviews(db),
    )
    .get(
      "/reviews/:id",
      {
        administrator: true,
        params: AdministrationModel.ReviewsIdGet.Params,
        response: AdministrationModel.ReviewsIdGet.Response,
      },
      async ({ params, status }) =>
        (await readReview(db, params.id)) ?? status(404, { code: "REVIEW_NOT_FOUND" }),
    )
    .post(
      "/reviews/:id/settlement",
      {
        administrator: true,
        params: AdministrationModel.ReviewsIdSettlementPost.Params,
        body: AdministrationModel.ReviewsIdSettlementPost.Body,
        response: AdministrationModel.ReviewsIdSettlementPost.Response,
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
    )
    .get(
      "/players/:id/sanctions",
      {
        administrator: true,
        params: AdministrationModel.PlayersIdSanctionsGet.Params,
        response: AdministrationModel.PlayersIdSanctionsGet.Response,
      },
      async ({ params, status }) =>
        (await readPlayerSanctions(db, params.id)) ?? status(404, { code: "PLAYER_NOT_FOUND" }),
    )
    .post(
      "/sanctions/:id/revocation",
      {
        administrator: true,
        params: AdministrationModel.SanctionsIdRevocationPost.Params,
        response: AdministrationModel.SanctionsIdRevocationPost.Response,
      },
      async ({ params, status }) => {
        const revoked = await revokeSanction(db, { sanctionId: params.id, at: new Date() });
        if (revoked === "not-found") return status(404, { code: "SANCTION_NOT_FOUND" });
        if (revoked === "already-revoked") return status(409, { code: "SANCTION_ALREADY_REVOKED" });
        return status(204, undefined);
      },
    );
