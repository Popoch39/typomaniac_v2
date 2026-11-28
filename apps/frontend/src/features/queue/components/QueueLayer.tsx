import { useQueueLayer } from "../hooks/useQueueLayer.ts";
import { PairingDialog } from "./PairingDialog.tsx";
import { QueueToast } from "./QueueToast.tsx";

/** The Queue on every page of the shell but Ranked, whose panel shows it already. */
export function QueueLayer() {
  const layer = useQueueLayer();

  if (layer.kind === "searching") return <QueueToast />;
  if (layer.kind === "pairing") return <PairingDialog />;
  return null;
}
