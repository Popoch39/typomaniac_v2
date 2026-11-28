import { useQueueLayer } from "../hooks/useQueueLayer.ts";
import { PairingDialog } from "./PairingDialog.tsx";
import { QueueEnteringToast } from "./QueueEnteringToast.tsx";
import { QueueNoticeToast } from "./QueueNoticeToast.tsx";
import { QueueToast } from "./QueueToast.tsx";

/** The Queue on every page of the shell but Ranked, whose panel shows it already. */
export function QueueLayer() {
  const layer = useQueueLayer();

  return (
    <>
      <QueueToast />
      {layer.kind === "pairing" && <PairingDialog />}
      {layer.kind === "entering" && <QueueEnteringToast />}
      {(layer.kind === "removed" || layer.kind === "disconnected" || layer.kind === "refused") && (
        <QueueNoticeToast notice={layer} />
      )}
    </>
  );
}
