import { useQueueLayer } from "../hooks/useQueueLayer.ts";
import { PairingDialog } from "./PairingDialog.tsx";
import { QueueEnteringToast } from "./QueueEnteringToast.tsx";
import { QueueNoticeToast } from "./QueueNoticeToast.tsx";
import { QueueToast } from "./QueueToast.tsx";

/** The Queue on every page of the shell but Ranked, whose panel shows it already. */
export function QueueLayer() {
  const layer = useQueueLayer();

  switch (layer.kind) {
    case "none":
      return null;
    case "searching":
      return <QueueToast />;
    case "pairing":
      return <PairingDialog />;
    case "entering":
      return <QueueEnteringToast />;
    case "removed":
    case "disconnected":
    case "refused":
      return <QueueNoticeToast notice={layer} />;
  }
}
