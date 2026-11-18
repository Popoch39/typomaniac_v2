import { Link } from "@tanstack/react-router";

// Never the error itself: what broke is for the console, not for the user.
export function RouteError() {
  return (
    <main>
      <p role="alert">Something went wrong on this page.</p>
      <Link to="/" className="text-primary underline underline-offset-4">
        Back to the home page
      </Link>
    </main>
  );
}
