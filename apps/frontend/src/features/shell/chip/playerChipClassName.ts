/**
 * The PlayerChip's box, shared by every state of the sidebar's Player block (Guest, skeleton, failed
 * session check), so that the bottom-anchored block keeps one height whatever the session turns out to
 * be. On the icon rail it drops its frame and shrinks to the avatar key.
 */
export const playerChipClassName =
  "flex min-w-0 items-center gap-3 rounded-lg border-2 border-key-outline bg-surface-raised p-2.5 pb-3 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0";
