import { SignInWithDiscordButton } from "./SignInWithDiscordButton.tsx";
import "./SignInPrompt.css";

interface SignInPromptProps {
  explanation: string;
}

export function SignInPrompt({ explanation }: SignInPromptProps) {
  return (
    <div className="sign-in-prompt">
      <p>{explanation}</p>
      <SignInWithDiscordButton />
    </div>
  );
}
