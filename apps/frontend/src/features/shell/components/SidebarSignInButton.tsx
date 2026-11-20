import { LogIn } from "lucide-react";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";

interface SidebarSignInButtonProps {
  onSignIn: () => void;
  isPending: boolean;
}

export function SidebarSignInButton({ onSignIn, isPending }: SidebarSignInButtonProps) {
  const label = isPending ? "Redirecting…" : "Sign in with Discord";

  return (
    <SidebarMenuButton onClick={onSignIn} disabled={isPending} tooltip={label}>
      <LogIn aria-hidden="true" />
      <span>{label}</span>
    </SidebarMenuButton>
  );
}
