import { Elysia } from "elysia";
import type { Auth } from "./auth.ts";

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth) =>
  new Elysia({ name: "protection" }).macro({
    signedIn: {
      async derive({ status, request: { headers } }) {
        const found = await auth.api.getSession({ headers });
        if (!found) return status(401, { code: "UNAUTHORIZED" });
        return { joueur: found.user, session: found.session };
      },
    },
    // Reads the session itself instead of enabling signedIn: a macro's hooks do not see what another macro derived.
    pseudoChosen: {
      async derive({ status, request: { headers } }) {
        const found = await auth.api.getSession({ headers });
        if (!found) return status(401, { code: "UNAUTHORIZED" });
        const { pseudo } = found.user;
        // A distinct status and code so a client sends the Joueur to choose a Pseudo rather than to sign in again.
        if (!pseudo) return status(403, { code: "PSEUDO_REQUIRED" });
        return { joueur: { ...found.user, pseudo }, session: found.session };
      },
    },
  });
