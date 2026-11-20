/** What a page needs to know of one of its reads, as TanStack Query reports it. */
export interface ReadStatus {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
}

/**
 * Where a page stands across the reads its layout waits on. A failed read being tried again counts
 * as loading, so that "Try again" brings the skeleton back rather than leaving the error up.
 */
export function readStage(reads: readonly ReadStatus[]): "loading" | "failed" | "ready" {
  const isRetrying = (read: ReadStatus) => read.isError && read.isFetching;
  if (reads.some((read) => read.isError && !isRetrying(read))) return "failed";
  if (reads.some((read) => read.isPending || isRetrying(read))) return "loading";
  return "ready";
}
