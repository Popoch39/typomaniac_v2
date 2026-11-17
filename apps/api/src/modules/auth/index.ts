import { Elysia, ElysiaStatus, status } from "elysia";
import type { Auth } from "./service.ts";

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth) => {
  // Shared as a function rather than by pseudoChosen enabling signedIn: a macro's hooks do not see what another macro derived.
  const findSession = async (headers: Headers) =>
    (await auth.api.getSession({ headers })) ?? status(401, { code: "UNAUTHORIZED" });

  return new Elysia({ name: "protection" }).macro({
    signedIn: {
      async derive({ request: { headers } }) {
        const found = await findSession(headers);
        if (found instanceof ElysiaStatus) return found;
        return { joueur: found.user, session: found.session };
      },
    },
    pseudoChosen: {
      async derive({ request: { headers } }) {
        const found = await findSession(headers);
        if (found instanceof ElysiaStatus) return found;
        const { pseudo } = found.user;
        // A distinct status and code so a client sends the Joueur to choose a Pseudo rather than to sign in again.
        if (!pseudo) return status(403, { code: "PSEUDO_REQUIRED" });
        return { joueur: { ...found.user, pseudo }, session: found.session };
      },
    },
  });
};
