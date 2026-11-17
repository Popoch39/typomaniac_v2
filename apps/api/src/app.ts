import { Elysia, t } from "elysia";
import type { Auth } from "./auth.ts";
import type { Db } from "./db/client.ts";
import { createProtection } from "./protection.ts";
import { isReservedPseudo, pseudoSchema, savePseudo } from "./pseudo.ts";

// The database and the auth instance are injected so tests can run each app against its own throwaway Postgres database.
export const createApp = (db: Db, auth: Auth) =>
  new Elysia()
    .decorate("db", db)
    // Mounted without a prefix: Better Auth routes on its own basePath (/api/auth).
    .mount(auth.handler)
    .use(createProtection(auth))
    .get("/health", () => "ok")
    .get("/api/me", { signedIn: true }, ({ joueur }) => ({
      id: joueur.id,
      pseudo: joueur.pseudo ?? null,
    }))
    .put(
      "/api/me/pseudo",
      { signedIn: true, body: t.Object({ pseudo: pseudoSchema }) },
      async ({ joueur, body, status }) => {
        if (isReservedPseudo(body.pseudo)) return status(422, { code: "PSEUDO_RESERVED" });
        if ((await savePseudo(db, joueur.id, body.pseudo)) === "taken")
          return status(409, { code: "PSEUDO_TAKEN" });
        return { id: joueur.id, pseudo: body.pseudo };
      },
    );

export type App = ReturnType<typeof createApp>;
