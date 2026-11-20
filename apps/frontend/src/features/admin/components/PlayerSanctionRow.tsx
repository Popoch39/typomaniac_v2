import { Keycap } from "../../../shared/components/Keycap.tsx";

interface PlayerSanctionRowProps {
  sanction: { line: string; revocable: boolean; isRevoking: boolean };
  disabled: boolean;
  onRevoke: () => void;
}

export function PlayerSanctionRow({
  sanction: { line, revocable, isRevoking },
  disabled,
  onRevoke,
}: PlayerSanctionRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-1">
      <span>{line}</span>
      {/* Kept in place once revoked, disabled, so the row keeps its size. */}
      <Keycap size="sm" disabled={disabled || !revocable} onClick={onRevoke}>
        {isRevoking ? "Revoking…" : revocable ? "Revoke" : "Revoked"}
      </Keycap>
    </li>
  );
}
