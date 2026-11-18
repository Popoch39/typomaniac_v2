import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

// A div, not a main: the shell's content area is already the page's main landmark.
export function Page({ children }: PageProps) {
  return <div className="flex flex-col items-start gap-4 p-8">{children}</div>;
}
