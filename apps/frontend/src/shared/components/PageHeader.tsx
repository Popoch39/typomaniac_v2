import { KeyWord } from "./KeyWord.tsx";

interface PageHeaderProps {
  title: string;
  lead: string;
}

export function PageHeader({ title, lead }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <KeyWord word={title} />
      <p className="m-0 max-w-140 type-lead text-ink-muted">{lead}</p>
    </header>
  );
}
