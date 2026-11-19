interface LpAmountProps {
  lp: number;
}

export function LpAmount({ lp }: LpAmountProps) {
  return (
    <>
      {lp} <span className="text-[13px] text-ink-subtle">LP</span>
    </>
  );
}
