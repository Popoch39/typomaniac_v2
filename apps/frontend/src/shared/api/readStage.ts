import { UNKNOWN_FAILURE } from "./describeApiError.ts";

/** What a page needs to know of one of its reads, as TanStack Query reports it. */
export interface ReadStatus {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  /** Undefined until the read first comes back: TanStack Query keeps it through a failed refetch. */
  data?: unknown;
}

export type ReadStage = "loading" | "failed" | "ready";

// A failed refetch of a read already shown leaves its data on screen, so it neither fails nor reloads
// the page: replacing what the Player is reading with an error or a skeleton would shift the layout.
const isFailedWithoutData = (read: ReadStatus) => read.isError && read.data === undefined;

const isRetrying = (read: ReadStatus) => isFailedWithoutData(read) && read.isFetching;

/**
 * Where a page stands across the reads its layout waits on. A failed read being tried again counts
 * as loading, so that "Try again" brings the skeleton back rather than leaving the error up.
 */
export function readStage(reads: readonly ReadStatus[]): ReadStage {
  if (reads.some((read) => isFailedWithoutData(read) && !read.isFetching)) return "failed";
  if (reads.some((read) => read.isPending || isRetrying(read))) return "loading";
  return "ready";
}

/** What a read gate shows: its content only ever receives the data once all of it is read. */
export type ReadGateState<T> =
  | { kind: "loading" }
  | { kind: "failed"; failure: string; retry: () => void }
  | { kind: "ready"; data: T };

/** The data a gate hands to its content once it is ready. */
export type ReadyData<State> = State extends { kind: "ready"; data: infer T } ? T : never;

/**
 * Where a gate stands, from the stage of its reads and their data, which is undefined until all of it
 * is read: null is data, such as the session of a Guest. A gate with no data yet stays pending rather
 * than drawing an empty page; a failure with nothing to say is told in general words, so that it can
 * still be tried again.
 */
export function readGate<T>(
  stage: ReadStage,
  data: T | undefined,
  failure: string | null,
  retry: () => void,
): ReadGateState<T> {
  if (stage === "failed") return { kind: "failed", failure: failure ?? UNKNOWN_FAILURE, retry };
  if (stage === "ready" && data !== undefined) return { kind: "ready", data };
  return { kind: "loading" };
}

/**
 * A read the page waits on but whose failure another part of it shows: it keeps the page loading,
 * a retry included, and never fails it.
 */
export function loadingOnly(read: ReadStatus): ReadStatus {
  return {
    isPending: read.isPending || isRetrying(read),
    isError: false,
    isFetching: read.isFetching,
  };
}

/** "Try again" across several reads: those that came back are not read twice. */
export function retryFailed(reads: readonly { isError: boolean; refetch: () => unknown }[]) {
  for (const read of reads) if (read.isError) void read.refetch();
}
