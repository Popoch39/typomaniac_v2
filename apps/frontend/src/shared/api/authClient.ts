import { createAuthClient } from "better-auth/client";

// Better Auth is mounted outside Elysia's routes, so Eden has no types for it: its own client calls it.
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
});
