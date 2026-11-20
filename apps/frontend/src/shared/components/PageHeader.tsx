import { KeyWord } from "./KeyWord.tsx";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <header>
      <KeyWord word={title} />
    </header>
  );
}
