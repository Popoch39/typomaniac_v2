import { LogoKey } from "./LogoKey.tsx";
import { Panel } from "./Panel.tsx";

export function PhoneUnavailableScreen() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8 text-center md:hidden">
      <Panel className="w-full max-w-sm items-center">
        <LogoKey />
        <h1 className="my-0 text-3xl">Typomaniac is not available on phones</h1>
        <p className="m-0 text-ink-muted">Play on a computer or tablet.</p>
      </Panel>
    </main>
  );
}
