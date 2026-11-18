import type { Result } from "@repo/typing-engine";

type ResultJsonProps = {
  result: Result;
};

export function ResultJson({ result }: ResultJsonProps) {
  return (
    <details>
      <summary className="cursor-pointer text-muted-foreground">Raw Result</summary>
      <pre className="max-h-[480px] overflow-auto bg-muted p-4 font-mono text-[14px]">
        {JSON.stringify(result, null, 2)}
      </pre>
    </details>
  );
}
