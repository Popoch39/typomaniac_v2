import { RouteErrorPanel } from "../../../shared/components/RouteErrorPanel.tsx";
import { RouteNotFoundPanel } from "../../../shared/components/RouteNotFoundPanel.tsx";
import { DevStateColumn } from "./DevStateColumn.tsx";

export function DevRouteStates() {
  return (
    <section aria-label="Routes" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Routes</h2>
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
        <DevStateColumn label="Route error">
          <RouteErrorPanel />
        </DevStateColumn>
        <DevStateColumn label="Not found">
          <RouteNotFoundPanel />
        </DevStateColumn>
      </div>
    </section>
  );
}
