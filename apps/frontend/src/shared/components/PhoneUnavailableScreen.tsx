import { BrandMark } from "./BrandMark.tsx";
import { Card, CardDescription, CardHeader } from "./ui/card.tsx";

export function PhoneUnavailableScreen() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8 text-center md:hidden">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <BrandMark className="mx-auto size-15" />
          <h1 className="my-0 text-3xl">Typomaniac is not available on phones</h1>
          <CardDescription className="text-base">Play on a computer or tablet.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
