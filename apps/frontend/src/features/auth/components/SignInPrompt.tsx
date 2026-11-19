import { Panel } from "../../../shared/components/Panel.tsx";
import { SignInWithDiscordButton } from "./SignInWithDiscordButton.tsx";

interface SignInPromptProps {
  explanation: string;
}

export function SignInPrompt({ explanation }: SignInPromptProps) {
  return (
    <Panel className="max-w-md">
      <p className="m-0 text-ink-muted">{explanation}</p>
      <SignInWithDiscordButton />
    </Panel>
  );
}
