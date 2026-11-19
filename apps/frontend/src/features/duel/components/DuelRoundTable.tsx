import type { useDuelRoundDetails } from "../hooks/useDuelRoundDetails.ts";

interface DuelRoundTableProps {
  number: number;
  table: NonNullable<ReturnType<typeof useDuelRoundDetails>>["table"];
}

const ROW = "grid grid-cols-[110px_56px_56px] items-baseline";

export function DuelRoundTable({ number, table }: DuelRoundTableProps) {
  return (
    <table className="flex min-w-0 flex-col gap-1">
      {/* Each row a grid of its own, so the row groups step aside from the column of rows. */}
      <thead className="contents">
        <tr className={`${ROW} pb-1.5 font-mono text-xs font-bold`}>
          <th className="text-left tracking-[.16em] text-ink-subtle uppercase">Round {number}</th>
          <th className="truncate text-right text-action">{table.names.self}</th>
          <th className="truncate text-right text-opponent">{table.names.opponent}</th>
        </tr>
      </thead>
      <tbody className="contents">
        {table.rows.map(({ label, values: [own, opponent] }) => (
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
