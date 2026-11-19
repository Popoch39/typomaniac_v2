import { createFileRoute, notFound } from "@tanstack/react-router";
import { DevRankUpPage } from "../features/duel/components/DevRankUpPage.tsx";

export const Route = createFileRoute("/dev/rankup")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: DevRankUpPage,
});
