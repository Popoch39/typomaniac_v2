import { createFileRoute } from "@tanstack/react-router";
import { PlayerPage } from "../../features/player/components/PlayerPage.tsx";

export const Route = createFileRoute("/_shell/players/$nickname")({
  component: PlayerPage,
});
