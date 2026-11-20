// Says what the Promotion and demotion markers on the Rank curve stand for.
export function RankChartLegend() {
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-1 p-0 text-xs text-ink-muted">
      <li className="flex items-center gap-1.5">
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-action">
          <path d="M6 0L12 11H0Z" />
        </svg>
        Promotion
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-danger">
          <path d="M6 12L12 1H0Z" />
        </svg>
        Demotion
      </li>
    </ul>
  );
}
