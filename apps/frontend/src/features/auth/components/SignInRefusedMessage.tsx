interface SignInRefusedMessageProps {
  reason: string;
}

export function SignInRefusedMessage({ reason }: SignInRefusedMessageProps) {
  return (
    <p role="alert" className="m-0 text-danger">
      {reason}
    </p>
  );
}
