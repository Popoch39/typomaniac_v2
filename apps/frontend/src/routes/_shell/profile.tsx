import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "../../features/profile/components/ProfilePage.tsx";

export const Route = createFileRoute("/_shell/profile")({
  component: ProfilePage,
});
