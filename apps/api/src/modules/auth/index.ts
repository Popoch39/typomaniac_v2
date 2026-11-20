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

const idOf = (value: unknown) =>
  typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
    ? value.id
    : undefined;

// The person the macros below derived, as a log record names them: `player` or `identity`, which
// a global hook or a socket's error hook only sees untyped. A Guest's identity has no Player id.
export const personOf = (context: object) => {
  const playerId = "player" in context ? idOf(context.player) : undefined;
  if (playerId) return { playerId };
  if (!("identity" in context)) return {};
  const { identity } = context;
  const id = idOf(identity);
  if (!id || typeof identity !== "object" || identity === null) return {};
  return "playerId" in identity && typeof identity.playerId === "string"
    ? { playerId: identity.playerId }
    : { guestId: id };
};

// Route options that guard a route. A separately defined route module must .use() this to get the options and their types.
export const createProtection = (auth: Auth, rateLimiter: RateLimiter) => {
  // Shared as a function rather than by nicknameChosen enabling signedIn: a macro's hooks do not see what another macro derived.
  const findSession = async (headers: Headers) =>
    (await auth.api.getSession({ headers })) ?? status(401, { code: "UNAUTHORIZED" });
  // Signed with the auth secret, so a Guest needs no secret of their own.
  const guestCookies = createGuestCookies(auth.$context.then(({ secret }) => secret));

  return new Elysia({ name: "protection" }).macro({
    // Never refuses: who is asking, the Player or the Guest, when known, for a public route to count
    // requests against. `requesterId` is null without a session or a Guest cookie, and no cookie is issued.
    requester: {
      async derive({ request: { headers } }) {
        const found = await auth.api.getSession({ headers });
        if (found) return { requesterId: found.user.id };
        const guest = await guestCookies.read(headers);
        return { requesterId: guest?.id ?? null };
      },
    },
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

/** The protection options, built once by `createApp` and `.use()`d by each module of routes. */
export type Protection = ReturnType<typeof createProtection>;

// Better Auth's routes, on its own basePath (/api/auth), given the client IP as the API resolves it.
export const createAuthRoutes = (auth: Auth, rateLimiter: RateLimiter) =>
  new Elysia().all(
    "/api/auth/*",
    // Left unparsed, as a mount does: Better Auth reads the body itself.
    { parse: "none", detail: { hide: true } },
    async ({ request, server, set }) => {
      const headers = new Headers(request.headers);
      const ip = rateLimiter.clientIp(request, server);
      if (ip === null) headers.delete(CLIENT_IP_HEADER);
      else headers.set(CLIENT_IP_HEADER, ip);
      const response = await auth.handler(new Request(request, { headers }));
      if (response.status !== 429) return response;
      // Better Auth answers { message } with X-Retry-After: refused as every other limit instead.
      return rateLimiter.refuse("auth", ip, Number(response.headers.get("x-retry-after")), set);
    },
  );
