import { Button } from "../../../shared/components/ui/button.tsx";

interface EnterQueueButtonProps {
  enter: () => void;
  isEntering: boolean;
}

export function EnterQueueButton({ enter, isEntering }: EnterQueueButtonProps) {
  return (
    <Button type="button" onClick={enter} disabled={isEntering}>
      {isEntering ? "Entering the Queue…" : "Enter the Queue"}
    </Button>
  );
}
