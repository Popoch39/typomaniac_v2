type ResultStatProps = {
  label: string;
  value: string;
};

export function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
