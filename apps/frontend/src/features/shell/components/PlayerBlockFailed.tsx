import { DangerIcon } from "../../../shared/components/DangerIcon.tsx";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";
import { playerChipClassName } from "../chip/playerChipClassName.ts";
import { PlayerBlockLayout } from "./PlayerBlockLayout.tsx";
import { RetryIcon } from "./RetryIcon.tsx";

interface PlayerBlockFailedProps {
  failure: string;
  retry: () => void;
}

// A failed session check in the chip's box: the sentence is cut to the lines the box holds, and on the
// icon rail the block shrinks to its danger icon; the title tooltip and screen readers get it whole.
export function PlayerBlockFailed({ failure, retry }: PlayerBlockFailedProps) {
  return (
    <PlayerBlockLayout
      chip={
        <div title={failure} className={playerChipClassName}>
          <span className="flex h-19 shrink-0 items-center group-data-[collapsible=icon]:w-16 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[zoom:0.75]">
            <DangerIcon />
          </span>
          <p
            role="alert"
            className="m-0 line-clamp-3 min-w-0 text-sm text-ink group-data-[collapsible=icon]:sr-only"
          >
            {failure}
          </p>
        </div>
      }
      action={
        <SidebarMenuButton onClick={retry} tooltip="Try again">
          <RetryIcon />
          <span>Try again</span>
        </SidebarMenuButton>
      }
    />
  );
}
