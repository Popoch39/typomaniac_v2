import { BackHomeLink } from "./BackHomeLink.tsx";

export function RouteNotFound() {
  return (
    <main>
      <p role="alert" className="text-danger">
        This page does not exist.
      </p>
      <BackHomeLink />
    </main>
  );
}
