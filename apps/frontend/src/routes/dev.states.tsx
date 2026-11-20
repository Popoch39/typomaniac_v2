import { createFileRoute, notFound } from "@tanstack/react-router";
import { DevStatesPage } from "../features/dev/components/DevStatesPage.tsx";

export const Route = createFileRoute("/dev/states")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: DevStatesPage,
});
