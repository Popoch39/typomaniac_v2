import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { PhoneUnavailableScreen } from "./PhoneUnavailableScreen.tsx";

export function RootLayout() {
  return (
    <>
      <div className="app-content">
        <Outlet />
      </div>
      <PhoneUnavailableScreen />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  );
}
