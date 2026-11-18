import { Elysia, ElysiaStatus, status } from "elysia";
import type { Auth } from "./service.ts";

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth) => {
  // Shared as a function rather than by nicknameChosen enabling signedIn: a macro's hooks do not see what another macro derived.
  const findSession = async (headers: Headers) =>
    (await auth.api.getSession({ headers })) ?? status(401, { code: "UNAUTHORIZED" });

  return new Elysia({ name: "protection" }).macro({
    signedIn: {
      async derive({ request: { headers } }) {
        const found = await findSession(headers);
        if (found instanceof ElysiaStatus) return found;
        return { player: found.user, session: found.session };
      },
    },
    nicknameChosen: {
      async derive({ request: { headers } }) {
        const found = await findSession(headers);
        if (found instanceof ElysiaStatus) return found;
        const { nickname } = found.user;
        // A distinct status and code so a client sends the Player to choose a Nickname rather than to sign in again.
        if (!nickname) return status(403, { code: "NICKNAME_REQUIRED" });
        return { player: { ...found.user, nickname }, session: found.session };
      },
    },
  });
};
