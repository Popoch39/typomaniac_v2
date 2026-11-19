import type { Logger } from "@repo/logger";
import { Elysia, ElysiaError, ElysiaStatus, StatusMap } from "elysia";

/** The probes, left out of the request log so that they do not flood it. */
const UNLOGGED_PATHS = new Set(["/health", "/ready"]);

type Tracked = { readonly requestId: string; readonly startedAt: number };

const idOf = (value: unknown) =>
  typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
    ? value.id
    : undefined;

// The protection macros derive `player` or `identity` on the routes that know the person, which a
// global hook only sees untyped. A Guest's identity has no Player id. Shared by the socket logs,
// whose error hooks do not see those types either.
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

// Better Auth is mounted on a catch-all, whose pattern says nothing: its paths carry no id.
const routeOf = ({ route, path }: { readonly route?: string; readonly path: string }) =>
  route === undefined || route === "/*" ? path : route;

const statusOf = (status: number | keyof StatusMap | undefined, response: unknown) => {
  if (response instanceof Response) return response.status;
  if (status === undefined) return 200;
  return typeof status === "number" ? status : StatusMap[status];
};

/**
 * Gives each request an id of the server's own, echoed in `x-request-id`, logs one line per request
 * once its response is sent, and turns any unexpected error into a 500 that leaks nothing but the
 * id. Used before the routes, which it reaches through its global hooks.
 */
export const createRequestLog = (logger: Logger) => {
  // Keyed by the request: `onRequest` runs before routing, before any context the later hooks share.
  const tracked = new WeakMap<Request, Tracked>();

  return new Elysia({ name: "request-log" })
    .onRequest(({ request, set }) => {
      // Never the client's: an id the client chose could point at someone else's request.
      const requestId = crypto.randomUUID();
      tracked.set(request, { requestId, startedAt: performance.now() });
      set.headers["x-request-id"] = requestId;
    })
    .onError("global", ({ error, request, status, ...context }) => {
      // Expected errors keep Elysia's response: validation (with its custom codes, such as
      // NICKNAME_INVALID), malformed bodies, invalid cookies.
      if (error instanceof ElysiaStatus) return;
      if (error instanceof ElysiaError && (error.status ?? 500) < 500) return;
      const requestId = tracked.get(request)?.requestId;
      logger.error("Unexpected error on {method} {route}", {
        method: request.method,
        route: routeOf(context),
        requestId,
        error,
      });
      return status(500, { code: "INTERNAL_ERROR", requestId });
    })
    .onAfterResponse("global", (context) => {
      const { request, set, responseValue } = context;
      const entry = tracked.get(request);
      if (!entry || UNLOGGED_PATHS.has(context.path)) return;
      // An upgrade never passes here, but each message of its socket does, on a copy of the
      // upgrade's context. A socket logs its own opening and closing instead.
      if (request.headers.get("upgrade")?.toLowerCase() === "websocket") return;
      const status = statusOf(set.status, responseValue);
      const properties = {
        method: request.method,
        route: routeOf(context),
        status,
        durationMs: Math.round(performance.now() - entry.startedAt),
        requestId: entry.requestId,
        ...personOf(context),
      };
      const message = "{method} {route} {status} in {durationMs} ms";
      if (status >= 500) logger.error(message, properties);
      else logger.info(message, properties);
    });
};
