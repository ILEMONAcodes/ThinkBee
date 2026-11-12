// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { startLockLifecycle } from "@/lib/app-lock/lifecycle";
import { appLockConfig } from "@/lib/app-lock/policy";
import { setLockState, useAppLock } from "@/lib/app-lock/state";
import { writeLock, type LockRecord } from "@/lib/app-lock/storage";

vi.mock("@/lib/auth/client", () => ({ getSupabase: () => ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } }) }));
const record: LockRecord = { format: 1, id: "11111111-1111-4111-8111-111111111111", ownerId: "22222222-2222-4222-8222-222222222222", pin: { salt: "A".repeat(43), hash: "A".repeat(43), iterations: 600_000 }, failures: 0, retryAt: 0 };
let stop = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
  setLockState("disabled", null, true);
});
afterEach(() => { stop(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("reconciles a lock enabled after settings initialized but before listeners started", () => {
  writeLock(record);
  stop = startLockLifecycle();
  expect(useAppLock.getState().status).toBe("locked");
  expect(document.documentElement.hasAttribute("data-app-lock")).toBe(true);
});

it("checks elapsed time before a first tap can extend an idle session after timers were suspended", () => {
  writeLock(record);
  setLockState("unlocked", record, true);
  stop = startLockLifecycle();
  vi.setSystemTime(Date.now() + appLockConfig.idleMs + 1);
  window.dispatchEvent(new Event("pointerdown"));
  expect(useAppLock.getState().status).toBe("locked");
});
