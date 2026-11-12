import { describe, expect, it } from "vitest";

import { appLockConfig } from "@/lib/app-lock/policy";
import { createPinVerifier, failedAttempt, matchesPin, newPinSchema, pinInputSchema } from "@/lib/app-lock/pin";
import type { LockRecord } from "@/lib/app-lock/storage";

describe("local PIN verifier", () => {
  // Exercise the production hashing cost even when other test workers share the CPU.
  it("salts each verifier and accepts only the exact PIN, including leading zeroes", { timeout: 15_000 }, async () => {
    const first = await createPinVerifier("012345");
    const second = await createPinVerifier("012345");
    expect(first.iterations).toBe(600_000);
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(JSON.stringify(first)).not.toContain("012345");
    await expect(matchesPin("012345", first)).resolves.toBe(true);
    await expect(matchesPin("012346", first)).resolves.toBe(false);
    await expect(matchesPin("12345", first)).resolves.toBe(false);
  });

  it("requires six ASCII digits and matching confirmation", () => {
    for (const input of ["", "12345", "1234567", "12a456", "１２３４５６", "123456\n", " 123456"]) {
      expect(pinInputSchema.safeParse(input).success).toBe(false);
    }
    expect(newPinSchema.safeParse({ pin: "012345", confirmation: "012345" }).success).toBe(true);
    expect(newPinSchema.safeParse({ pin: "012345", confirmation: "543210" }).success).toBe(false);
  });

  it("starts a delay on the fifth failure, doubles it and caps it at fifteen minutes", () => {
    let record = { failures: 0, retryAt: 0 } as LockRecord;
    for (let attempt = 1; attempt <= 4; attempt++) {
      record = failedAttempt(record, 1000);
      expect(record.retryAt).toBe(0);
    }
    record = failedAttempt(record, 1000);
    expect(record.retryAt).toBe(31_000);
    record = failedAttempt(record, 31_000);
    expect(record.retryAt).toBe(91_000);
    record = failedAttempt({ ...record, failures: 99 }, 1000);
    expect(record.retryAt).toBe(1000 + appLockConfig.retryMaximumMs);
    expect(failedAttempt(record, 1000).failures).toBe(100);
  });
});
