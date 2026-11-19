import { BackHomeLink } from "./BackHomeLink.tsx";

// Never the error itself: what broke is for the console, not for the user.
export function RouteError() {
  return (
    <main>
      <p role="alert" className="text-danger">
        Something went wrong on this page.
      </p>
      <BackHomeLink />
    </main>
  );
}
