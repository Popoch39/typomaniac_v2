import type { Logger } from "@repo/logger";
import { Elysia, ElysiaError, ElysiaStatus, StatusMap } from "elysia";
import { ElysiaWS } from "elysia/ws";
import { personOf } from "../auth/index.ts";

/** The probes, left out of the request log so that they do not flood it. */
const UNLOGGED_PATHS = new Set(["/health", "/ready"]);

type Tracked = { readonly requestId: string; readonly startedAt: number };

// Better Auth is mounted on a catch-all, whose pattern says nothing: its paths carry no id. A
// socket route's refused upgrade is told no pattern: it is rebuilt from the params.
const routeOf = ({
  route,
  path,
  params = {},
}: {
  readonly route?: string;
  readonly path: string;
  readonly params?: Readonly<Record<string, unknown>>;
}) => {
  if (route === "/*") return path;
  if (route !== undefined) return route;
  return Object.entries(params).reduce(
    (pattern, [name, value]) =>
      typeof value === "string" ? pattern.replace(`/${value}`, `/:${name}`) : pattern,
    path,
  );
};

const statusOf = (status: number | keyof StatusMap | undefined, response: unknown) => {
  if (response instanceof Response || response instanceof ElysiaStatus) return response.status;
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

  // Writes the request's one line, the first time it is asked to.
  const writeLine = (context: {
    readonly request: Request;
    readonly set: { readonly status?: number | keyof StatusMap };
    readonly responseValue: unknown;
    readonly route?: string;
    readonly path: string;
    readonly params?: Readonly<Record<string, unknown>>;
  }) => {
    const { request, set, responseValue } = context;
    const entry = tracked.get(request);
    if (!entry || UNLOGGED_PATHS.has(context.path)) return;
    tracked.delete(request);
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
  };

  return (
    new Elysia({ name: "request-log" })
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
      // A socket route answers a refused upgrade without passing the after-response hook: its line
      // is written here. An accepted upgrade passes neither, and the messages of its socket, on a copy
      // of the socket, need no line: a socket logs its own opening and closing.
      .mapResponse("global", (context) => {
        if (context instanceof ElysiaWS) return;
        if (context.request.headers.get("upgrade")?.toLowerCase() !== "websocket") return;
        writeLine(context);
      })
      .onAfterResponse("global", (context) => {
        if (context instanceof ElysiaWS) return;
        writeLine(context);
      })
  );
};
