import { useDuelInviteLink } from "../hooks/useDuelInviteLink.ts";

export function DuelInviteLink() {
  const link = useDuelInviteLink();
  if (link === null) return null;

  return (
    <p>
      Send this link to your Opponent: <code>{link}</code>
    </p>
  );
}
