import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readGate, readStage } from "../../../shared/api/readStage.ts";
import { meQueryOptions } from "../api/meQueryOptions.ts";
import { sessionOf } from "../session/sessionOf.ts";

export function useSession() {
  const me = useQuery(meQueryOptions());
  const { data, error } = me;
  const session = sessionOf(data);
  return {
    session,
    /** Ready once the session is known, a Guest included. */
    gate: readGate(
      readStage([me]),
      session.kind === "checking" ? undefined : session,
      error === null ? null : describeApiError(error),
      () => void me.refetch(),
    ),
  };
}
