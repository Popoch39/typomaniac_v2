import { RouteErrorPage } from "./RouteErrorPage.tsx";
import { RouteNotFoundPanel } from "./RouteNotFoundPanel.tsx";

export function RouteNotFound() {
  return (
    <RouteErrorPage>
      <RouteNotFoundPanel />
    </RouteErrorPage>
  );
}
