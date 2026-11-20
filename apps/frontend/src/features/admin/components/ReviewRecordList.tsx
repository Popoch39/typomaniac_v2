interface ReviewRecordListProps {
  title: string;
  empty: string;
  records: { key: string; line: string }[];
}

export function ReviewRecordList({ title, empty, records }: ReviewRecordListProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="m-0 type-eyebrow text-ink-subtle">{title}</h3>
      {records.length === 0 ? (
        <p className="m-0 text-ink-muted">{empty}</p>
      ) : (
        <ul className="m-0 flex flex-col gap-1 pl-5">
          {records.map(({ key, line }) => (
            <li key={key}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
