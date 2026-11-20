import { createFileRoute, notFound } from "@tanstack/react-router";
import { AdminPage } from "../../features/admin/components/AdminPage.tsx";
import { readReviewParam } from "../../features/admin/review/readReviewParam.ts";
import { meQueryOptions } from "../../features/auth/api/meQueryOptions.ts";

export const Route = createFileRoute("/_shell/admin")({
  validateSearch: (search: Record<string, unknown>): { review?: string } => {
    const review = readReviewParam(search.review);
    return review === undefined ? {} : { review };
  },
  // Anyone but the administrator meets the page that does not exist. The server refuses them every
  // administration route all the same: this only keeps the page out of their way.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions());
    if (me?.isAdministrator !== true) throw notFound();
  },
  component: AdminPage,
});
