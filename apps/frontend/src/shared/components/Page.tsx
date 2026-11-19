import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

// A div, not a main: the shell's content area is already the page's main landmark.
export function Page({ children }: PageProps) {
  return (
    <div className="flex w-full max-w-280 flex-col gap-10 px-[clamp(16px,4vw,56px)] pt-[clamp(20px,4vw,48px)] pb-18">
      {children}
    </div>
  );
}
