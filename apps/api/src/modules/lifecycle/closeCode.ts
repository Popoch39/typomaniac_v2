/** The WebSocket close codes the API sends or acts on, named once (RFC 6455, section 7.4.1). */
export const CloseCode = {
  /** The connection dropped without a close frame: the client may come back. */
  abnormal: 1006,
  /** The client broke a rule of the socket, such as its message rate. */
  policyViolation: 1008,
  /** The instance stops, not for anything its client did: the client may come back. */
  serviceRestart: 1012,
} as const;

/** Whether a socket that closed with `code` may be reopened by its client shortly. */
export const mayReconnect = (code: number | undefined) =>
  code === CloseCode.abnormal || code === CloseCode.serviceRestart;
