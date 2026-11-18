import { Button } from "../../../shared/components/ui/button.tsx";
import { useRestart } from "../hooks/useRestart.ts";

export function RestartButton() {
  const restart = useRestart();

  return (
    <Button type="button" variant="outline" className="mt-6" onClick={restart}>
      Restart
    </Button>
  );
}
