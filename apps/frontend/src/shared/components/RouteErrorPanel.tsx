import { BackHomeKey } from "./BackHomeKey.tsx";
import { ErrorPanel } from "./ErrorPanel.tsx";

// Never the error itself: what broke is for the console, not for the Player.
export function RouteErrorPanel() {
  return (
    <ErrorPanel title="Page" message="Something went wrong on this page.">
      <BackHomeKey />
    </ErrorPanel>
  );
}
