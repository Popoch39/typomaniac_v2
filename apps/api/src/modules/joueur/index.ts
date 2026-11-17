import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import * as JoueurModel from "./model.ts";
import { isReservedPseudo, savePseudo } from "./service.ts";

export const createJoueurRoutes = (db: Db, auth: Auth) =>
  new Elysia({ prefix: "/api/me" })
    .use(createProtection(auth))
    .get("/", { signedIn: true }, ({ joueur }) => ({
      id: joueur.id,
      pseudo: joueur.pseudo ?? null,
    }))
    .put(
      "/pseudo",
      { signedIn: true, body: JoueurModel.PseudoPut.Body },
      async ({ joueur, body, status }) => {
        if (isReservedPseudo(body.pseudo)) return status(422, { code: "PSEUDO_RESERVED" });
        if ((await savePseudo(db, joueur.id, body.pseudo)) === "taken")
          return status(409, { code: "PSEUDO_TAKEN" });
        return { id: joueur.id, pseudo: body.pseudo };
      },
    );
