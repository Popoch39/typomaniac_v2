/**
 * The page the URL must be replaced by, when the server served another page than the one asked for.
 * Never while the previous page stands in (placeholder) for the one asked for: it was served for
 * another request.
 */
export function pageToReplace(requested: number, served: { page: number; isPlaceholder: boolean }) {
  return served.isPlaceholder || requested === served.page ? null : served.page;
}
