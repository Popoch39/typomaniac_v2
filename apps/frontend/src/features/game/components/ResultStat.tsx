type ResultStatProps = {
  label: string;
  value: string;
};

export function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
