import { createFileRoute } from "@tanstack/react-router";
import { RankedComingSoonPage } from "../../features/ranked/components/RankedComingSoonPage.tsx";

export const Route = createFileRoute("/_shell/ranked")({
  component: RankedComingSoonPage,
});
