import { useSession } from "../../auth/hooks/useSession.ts";
import { isAdministrator } from "../../auth/session/sessionOf.ts";

export function useIsAdministrator() {
  return isAdministrator(useSession().session);
}
