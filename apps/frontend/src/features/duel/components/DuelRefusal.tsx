import { useDuelRefusalMessage } from "../hooks/useDuelRefusalMessage.ts";

export function DuelRefusal() {
  const message = useDuelRefusalMessage();

  return <p role="alert">{message}</p>;
}
