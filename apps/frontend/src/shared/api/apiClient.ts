import { treaty } from "@elysia/eden";
// Type-only: the API's code never reaches the bundle, only the shape of its routes.
import type { App } from "../../../../api/src/app.ts";

// Front and API share one origin, the dev server proxying /api as production does.
export const apiClient = treaty<App>(window.location.origin);
