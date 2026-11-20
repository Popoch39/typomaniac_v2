import { BackHomeKey } from "./BackHomeKey.tsx";
import { ErrorPanel } from "./ErrorPanel.tsx";

export function RouteNotFoundPanel() {
  return (
    <ErrorPanel title="Not found" message="This page does not exist.">
      <BackHomeKey />
    </ErrorPanel>
  );
}
