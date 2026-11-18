import type { LucideIcon } from "lucide-react";

interface StatusMessageProps {
  role: "status" | "alert";
  icon: LucideIcon;
  message: string;
}

/**
 * On the tablet icon rail the message is too long to show: it shrinks to its icon, while the title
 * tooltip and screen readers still get the whole message. Elsewhere the icon stays hidden.
 */
export function StatusMessage({ role, icon: Icon, message }: StatusMessageProps) {
  return (
    <p
      role={role}
      title={message}
      className="flex items-center gap-2 text-sm group-data-[collapsible=icon]:justify-center"
    >
      <Icon
        aria-hidden="true"
        className="hidden size-5 shrink-0 group-data-[collapsible=icon]:block"
      />
      <span className="group-data-[collapsible=icon]:sr-only">{message}</span>
    </p>
  );
}
