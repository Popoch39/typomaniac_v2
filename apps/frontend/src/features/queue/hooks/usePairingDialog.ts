// The Pairing is answered by accepting it or letting the time run out: the dialog never closes itself.
const keepOpen = (event: Event) => event.preventDefault();

export function usePairingDialog() {
  return {
    keepOpen,
    // The dialog itself takes the focus, not the Accept key, so that a key typed into the Practice
    // Game an instant earlier, Space or Enter, never presses it.
    focusDialog: (event: Event) => {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
    },
  };
}
