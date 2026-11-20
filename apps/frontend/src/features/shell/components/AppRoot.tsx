import { RootLayout } from "../../../shared/components/RootLayout.tsx";
import { OnlineHeartbeat } from "../../online/components/OnlineHeartbeat.tsx";

// The heartbeat sits at the root, outside the shell, so that a Player in a Duel stays Online.
export function AppRoot() {
  return (
    <>
      <OnlineHeartbeat />
      <RootLayout />
    </>
  );
}
