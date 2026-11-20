/** The search of the sign-in page, as Better Auth's redirect after a refused sign-in leaves it. */
export type SignInSearch = {
  readonly error?: string;
  readonly error_description?: string;
};

/** Why a sign-in was refused: a Ban, with the address to contest it, or any other reason. */
export type SignInRefusal =
  | { readonly kind: "banned"; readonly appealAddress: string }
  | { readonly kind: "refused"; readonly reason: string };

const textOf = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);

/** Keeps only the parameters Better Auth sets, and only when they are text. */
export function readSignInSearch(search: Record<string, unknown>): SignInSearch {
  return { error: textOf(search.error), error_description: textOf(search.error_description) };
}

/** The refusal the sign-in page shows, or null when it was reached without one. */
export function signInRefusalOf({ error, error_description }: SignInSearch): SignInRefusal | null {
  if (error === undefined) return null;
  // The API sends the appeal address as the description of a Ban.
  if (error === "BANNED" && error_description !== undefined)
    return { kind: "banned", appealAddress: error_description };
  return { kind: "refused", reason: error_description ?? "Signing in failed. Try again." };
}
