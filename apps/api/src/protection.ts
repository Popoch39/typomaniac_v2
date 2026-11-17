import { Elysia } from "elysia";
import type { Auth } from "./auth.ts";

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth) =>
  new Elysia({ name: "protection" }).macro({
    signedIn: {
      async derive({ status, request: { headers } }) {
        const found = await auth.api.getSession({ headers });
        if (!found) return status(401, "Unauthorized");
        return { joueur: found.user, session: found.session };
      },
    },
  });
