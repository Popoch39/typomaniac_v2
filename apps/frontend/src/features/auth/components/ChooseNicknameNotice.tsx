interface ChooseNicknameNoticeProps {
  /** What the Nickname is needed for, such as "enter the Queue". */
  purpose: string;
}

// Everything shown to other Players takes a Nickname: a Player without one is told so in the same
// words on every page, rather than offered what they cannot use yet.
export function ChooseNicknameNotice({ purpose }: ChooseNicknameNoticeProps) {
  return <p className="m-0 text-ink-muted">Choose a Nickname to {purpose}.</p>;
}
