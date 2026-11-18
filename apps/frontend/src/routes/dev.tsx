import { createFileRoute, notFound } from "@tanstack/react-router";
import { GameScreen } from "../features/game/components/GameScreen.tsx";

export const Route = createFileRoute("/dev")({
  // A test page must never reach Players: production builds answer not found.
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: GameScreen,
});
