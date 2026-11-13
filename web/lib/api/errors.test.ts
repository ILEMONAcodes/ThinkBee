import { expect, it } from "vitest";

import { AppError, errorKey } from "@/lib/api/errors";

it.each(["account_store_unavailable", "auth_verifier_unavailable", "farmer_id_unavailable"])(
  "describes %s as a service problem rather than a lost connection", (code) => {
    expect(errorKey(new AppError(code, 503))).toBe("accountUnavailable");
  },
);

it("distinguishes a slow account startup from a network failure", () => {
  expect(errorKey(new AppError("account_startup_timeout"))).toBe("accountTimeout");
  expect(errorKey(new AppError("network_unavailable"))).toBe("unavailable");
  expect(errorKey(new AppError("request_failed", 500))).toBe("accountUnavailable");
});
