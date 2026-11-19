/** The page the URL must be replaced by, when the server served another page than the one asked for. */
export function pageToReplace(requested: number, served: number) {
  return requested === served ? null : served;
}
