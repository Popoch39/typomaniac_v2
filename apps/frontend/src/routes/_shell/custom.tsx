import { createFileRoute } from "@tanstack/react-router";
import { CustomDuelPage } from "../../features/duel/components/CustomDuelPage.tsx";

export const Route = createFileRoute("/_shell/custom")({
  component: CustomDuelPage,
});
