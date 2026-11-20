import { FlaskConical } from "lucide-react";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";
import type { DevPlayerNickname } from "../../auth/hooks/useDevSignIn.ts";

interface SidebarDevSignInButtonProps {
  nickname: DevPlayerNickname;
  onSignIn: () => void;
  isPending: boolean;
}

export function SidebarDevSignInButton({
  nickname,
  onSignIn,
  isPending,
}: SidebarDevSignInButtonProps) {
  const label = isPending ? "Signing in…" : `Dev: sign in as ${nickname}`;

  return (
    <SidebarMenuButton onClick={onSignIn} disabled={isPending} tooltip={label}>
      <FlaskConical aria-hidden="true" />
      <span>{label}</span>
    </SidebarMenuButton>
  );
}
