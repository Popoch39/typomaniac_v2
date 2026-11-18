import { createFileRoute } from "@tanstack/react-router";
import { ShellLayout } from "../features/shell/components/ShellLayout.tsx";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});
