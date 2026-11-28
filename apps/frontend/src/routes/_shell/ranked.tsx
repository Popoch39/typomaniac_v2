import { createFileRoute } from "@tanstack/react-router";
import { RankedPage } from "../../features/ranked/components/RankedPage.tsx";

export const Route = createFileRoute("/_shell/ranked")({
  component: RankedPage,
});
