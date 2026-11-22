import type { ReactNode } from "react";
import { Panel } from "../../../shared/components/Panel.tsx";

interface ChallengeCardProps {
  title: string;
  /** The time left, in the card's tag. */
  timeLeft?: string;
  /** Keeps the tag's room while the time left is not known yet. */
  isTimeHidden?: boolean;
  children: ReactNode;
}

/** A card floating over the page, which it never pushes aside. */
export function ChallengeCard({
  title,
  timeLeft,
  isTimeHidden = false,
  children,
}: ChallengeCardProps) {
  return (
    <Panel
      title={title}
      tag={timeLeft}
      isTagHidden={isTimeHidden}
      className="pointer-events-auto gap-4 p-5"
    >
      {children}
    </Panel>
  );
}
