import type { Result } from "@repo/typing-engine";

type ResultJsonProps = {
  result: Result;
};

export function ResultJson({ result }: ResultJsonProps) {
  return (
    <details className="result-json">
      <summary>Raw Result</summary>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </details>
  );
}
