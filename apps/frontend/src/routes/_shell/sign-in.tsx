import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "../../features/auth/components/SignInPage.tsx";
import { readSignInSearch } from "../../features/auth/refusal/signInRefusalOf.ts";

// Where Better Auth sends the Player back when it refuses a sign-in, with why in the search.
export const Route = createFileRoute("/_shell/sign-in")({
  validateSearch: readSignInSearch,
  component: SignInPage,
});
