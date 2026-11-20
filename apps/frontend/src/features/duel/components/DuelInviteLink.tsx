interface DuelInviteLinkProps {
  /** `null` once the Opponent has arrived. */
  link: string | null;
}

export function DuelInviteLink({ link }: DuelInviteLinkProps) {
  if (link === null) return null;

  return (
    <p>
      Send this link to your Opponent: <code>{link}</code>
    </p>
  );
}
