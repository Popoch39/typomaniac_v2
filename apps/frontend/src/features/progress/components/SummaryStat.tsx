interface SummaryStatProps {
  label: string;
  value: string;
}

export function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dt className="type-eyebrow text-ink-subtle">{label}</dt>
      <dd className="m-0 type-metric-lg text-ink tabular-nums">{value}</dd>
    </div>
  );
}
