import { BackHomeLink } from "./BackHomeLink.tsx";

export function RouteNotFound() {
  return (
    <main>
      <p role="alert">This page does not exist.</p>
      <BackHomeLink />
    </main>
  );
}
