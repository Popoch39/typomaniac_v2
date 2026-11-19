import { Elysia, ElysiaStatus, status } from "elysia";
import type { RateLimiter } from "../rate-limit/index.ts";
import { createGuestCookies } from "./guest.ts";
import { type Auth, CLIENT_IP_HEADER } from "./service.ts";

/** A Participant as the routes see them: `playerId` and `avatarUrl` are `null` for a Guest. */
type Identity = {
  readonly id: string;
  readonly name: string;
  readonly playerId: string | null;
  readonly avatarUrl: string | null;
};

// One type for both branches, so that a route sees a single identity rather than their intersection.
const withIdentity = (identity: Identity) => ({ identity });

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth, rateLimiter: RateLimiter) => {
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
      async derive({ request, server, set }) {
        const { headers } = request;
        const found = await auth.api.getSession({ headers });
        if (found) {
          const { id, nickname, image } = found.user;
          // A Player without a Nickname is refused rather than seated as a Guest under a name they did not choose.
          if (!nickname) return status(403, { code: "NICKNAME_REQUIRED" });
          return withIdentity({ id, name: nickname, playerId: id, avatarUrl: image ?? null });
        }
        // A Guest has no Player id: nothing they play is attached to anyone.
        const guest = await guestCookies.read(headers);
        if (guest) return withIdentity({ ...guest, playerId: null, avatarUrl: null });
        // Counted per IP: dropping the cookie must not be a way to start every other count afresh.
        const refused = await rateLimiter.check(
          "guestPerIp",
          rateLimiter.clientIp(request, server),
          set,
        );
        if (refused) return refused;
        const issued = await guestCookies.issue();
        set.headers["set-cookie"] = issued.setCookie;
        return withIdentity({ ...issued.guest, playerId: null, avatarUrl: null });
      },
    },
  });
};

// Better Auth's routes, on its own basePath (/api/auth), given the client IP as the API resolves it.
export const createAuthRoutes = (auth: Auth, rateLimiter: RateLimiter) =>
  new Elysia().all(
    "/api/auth/*",
    // Left unparsed, as a mount does: Better Auth reads the body itself.
    { parse: "none", detail: { hide: true } },
    ({ request, server }) => {
      const headers = new Headers(request.headers);
      const ip = rateLimiter.clientIp(request, server);
      if (ip === null) headers.delete(CLIENT_IP_HEADER);
      else headers.set(CLIENT_IP_HEADER, ip);
      return auth.handler(new Request(request, { headers }));
    },
  );
