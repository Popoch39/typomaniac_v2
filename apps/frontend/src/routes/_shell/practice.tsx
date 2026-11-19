import { createFileRoute } from "@tanstack/react-router";
import { GameScreen } from "../../features/game/components/GameScreen.tsx";
import { useGameStore } from "../../features/game/store/useGameStore.ts";

export const Route = createFileRoute("/_shell/practice")({
  // The Game store is shared with Duels and outlives the page: entering Practice always starts a fresh Game.
  onEnter: () => useGameStore.getState().restart(),
  component: GameScreen,
});
