import type { ReactNode } from "react";

interface DuelEndKeysProps {
  children: ReactNode;
}

export function DuelEndKeys({ children }: DuelEndKeysProps) {
  return (
    // Room under the keys for their edge.
    <div className="flex items-center justify-center gap-5 pt-2 pb-[9px]">{children}</div>
  );
}
