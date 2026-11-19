import type { RoundTableRow } from "../round/roundTable.ts";

interface DuelRoundTableProps {
  number: number;
  names: { readonly self: string; readonly opponent: string };
  rows: readonly RoundTableRow[];
}

const ROW = "grid grid-cols-[110px_56px_56px] items-baseline";

export function DuelRoundTable({ number, names, rows }: DuelRoundTableProps) {
  return (
    <table className="flex min-w-0 flex-col gap-1">
      {/* Each row a grid of its own, so the row groups step aside from the column of rows. */}
      <thead className="contents">
        <tr className={`${ROW} pb-1.5 font-mono text-xs font-bold`}>
          <th className="text-left tracking-[.16em] text-ink-subtle uppercase">Round {number}</th>
          <th className="truncate text-right text-action">{names.self}</th>
          <th className="truncate text-right text-opponent">{names.opponent}</th>
        </tr>
      </thead>
      <tbody className="contents">
        {rows.map(({ label, values: [own, opponent] }) => (
          <tr key={label} className={`${ROW} py-1.5`}>
            <th scope="row" className="text-left text-sm font-normal text-ink-subtle">
              {label}
            </th>
            <td className="text-right font-mono text-[15px] font-bold text-ink tabular-nums">
              {own}
            </td>
            <td className="text-right font-mono text-[15px] font-bold text-ink-muted tabular-nums">
              {opponent}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
