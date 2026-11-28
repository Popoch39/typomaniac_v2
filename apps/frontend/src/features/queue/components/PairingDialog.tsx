import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../shared/components/ui/dialog.tsx";
import { usePairingDialog } from "../hooks/usePairingDialog.ts";
import { PairingPromptBody } from "./PairingPromptBody.tsx";

/** The Pairing prompt over any page of the shell, as a modal dialog. */
export function PairingDialog() {
  const { keepOpen, focusDialog } = usePairingDialog();

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={focusDialog}
        onEscapeKeyDown={keepOpen}
        onInteractOutside={keepOpen}
        className="gap-5 rounded-3xl border-3 border-key-outline bg-surface-card p-7 text-base text-ink ring-0 sm:max-w-xl"
      >
        <DialogTitle className="type-card-title text-action">Opponent found</DialogTitle>
        <DialogDescription className="sr-only">
          A ranked Duel was found. Accept it to play.
        </DialogDescription>
        <PairingPromptBody />
      </DialogContent>
    </Dialog>
  );
}
