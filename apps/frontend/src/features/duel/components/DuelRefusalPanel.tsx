import { BackHomeKey } from "../../../shared/components/BackHomeKey.tsx";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";

interface DuelRefusalPanelProps {
  /** Why the seat was refused, in words for the user. */
  message: string;
}

export function DuelRefusalPanel({ message }: DuelRefusalPanelProps) {
  return (
    <ErrorPanel title="Duel" message={message}>
      <BackHomeKey />
    </ErrorPanel>
  );
}
