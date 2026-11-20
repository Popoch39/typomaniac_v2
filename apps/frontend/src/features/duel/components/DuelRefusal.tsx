import { useDuelRefusalMessage } from "../hooks/useDuelRefusalMessage.ts";
import { DuelRefusalPanel } from "./DuelRefusalPanel.tsx";

export function DuelRefusal() {
  const message = useDuelRefusalMessage();
  if (message === null) return null;

  return <DuelRefusalPanel message={message} />;
}
