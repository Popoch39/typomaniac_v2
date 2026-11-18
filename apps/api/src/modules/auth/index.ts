import { Elysia, ElysiaStatus, status } from "elysia";
import { createGuestCookies } from "./guest.ts";
import type { Auth } from "./service.ts";

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth) => {
  // Shared as a function rather than by nicknameChosen enabling signedIn: a macro's hooks do not see what another macro derived.
  const findSession = async (headers: Headers) =>
    (await auth.api.getSession({ headers })) ?? status(401, { code: "UNAUTHORIZED" });
  // Signed with the auth secret, so a Guest needs no secret of their own.
  const guestCookies = createGuestCookies(auth.$context.then(({ secret }) => secret));

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
    // A Player with a Nickname or a Guest. Anyone without a session becomes a Guest, given a signed
    // cookie on first contact, which an upgrade must pass on with `upgrade: ({ set }) => set.headers`.
    participant: {
      async derive({ request: { headers }, set }) {
        const found = await auth.api.getSession({ headers });
        if (found) {
          const { id, nickname } = found.user;
          // A Player without a Nickname is refused rather than seated as a Guest under a name they did not choose.
          if (!nickname) return status(403, { code: "NICKNAME_REQUIRED" });
          return { identity: { id, name: nickname } };
        }
        const guest = await guestCookies.read(headers);
        if (guest) return { identity: guest };
        const issued = await guestCookies.issue();
        set.headers["set-cookie"] = issued.setCookie;
        return { identity: issued.guest };
      },
    },
  });
};
