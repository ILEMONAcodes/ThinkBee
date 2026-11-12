export type LockErrorCode = "storage" | "unsupported" | "incorrect" | "cooldown" | "changed" | "cancelled" | "device" | "session";

export class LockError extends Error {
  constructor(public readonly code: LockErrorCode) { super(code); }
}
