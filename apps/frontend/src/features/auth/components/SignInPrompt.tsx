import { Card, CardContent, CardHeader } from "../../../shared/components/ui/card.tsx";
import { SignInWithDiscordButton } from "./SignInWithDiscordButton.tsx";

interface SignInPromptProps {
  explanation: string;
}

export function SignInPrompt({ explanation }: SignInPromptProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-base">{explanation}</p>
      </CardHeader>
      <CardContent>
        <SignInWithDiscordButton />
      </CardContent>
    </Card>
  );
}
