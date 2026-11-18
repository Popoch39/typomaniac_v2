import { CircleAlert, LogIn } from "lucide-react";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { useSignInWithDiscord } from "../../auth/hooks/useSignInWithDiscord.ts";

export function SidebarSignInButton() {
  const { signIn, isPending, failure } = useSignInWithDiscord();
  const label = isPending ? "Redirecting…" : "Sign in with Discord";

  return (
    <>
      <SidebarMenuButton onClick={signIn} disabled={isPending} tooltip={label}>
        <LogIn aria-hidden="true" />
        <span>{label}</span>
      </SidebarMenuButton>
      {failure && <StatusMessage role="alert" icon={CircleAlert} message={failure} />}
    </>
  );
}
