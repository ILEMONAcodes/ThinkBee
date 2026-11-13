export class AppError extends Error {
  constructor(public readonly code: string, public readonly status = 0) {
    super(code);
    this.name = "AppError";
  }
}

export function errorKey(error: unknown): "session" | "unavailable" | "accountUnavailable" | "accountTimeout" | "invalid" | "limited" | "storage" | "expired" | "configuration" | "suspended" | "deleted" {
  if (!(error instanceof AppError)) return "unavailable";
  if (error.code === "account_startup_timeout") return "accountTimeout";
  if (["account_store_unavailable", "auth_verifier_unavailable", "farmer_id_unavailable"].includes(error.code)) return "accountUnavailable";
  if (error.status >= 500) return "accountUnavailable";
  if (error.code === "storage_unavailable") return "storage";
  if (error.code === "auth_configuration") return "configuration";
  if (error.code === "link_expired") return "expired";
  if (error.code === "account_suspended") return "suspended";
  if (error.code === "account_deleted") return "deleted";
  if (error.status === 401 || error.code === "account_changed") return "session";
  if (error.status === 429 || error.code.endsWith("_limit_reached")) return "limited";
  if (error.status === 422 || error.status === 400) return "invalid";
  return "unavailable";
}
