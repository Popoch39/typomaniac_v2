import { createFileRoute } from "@tanstack/react-router";
import { FriendsPage } from "../../features/friends/components/FriendsPage.tsx";

export const Route = createFileRoute("/_shell/friends")({
  component: FriendsPage,
});
