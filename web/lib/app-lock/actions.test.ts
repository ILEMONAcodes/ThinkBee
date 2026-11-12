// @vitest-environment jsdom
import { pbkdf2Sync, webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { changeAppLock, enableAppLock, enableDeviceUnlock, unlockWithDevice, unlockWithPin } from "@/lib/app-lock/actions";
import { appLockStorageKey } from "@/lib/app-lock/config";
import * as pin from "@/lib/app-lock/pin";
import { lockApp, reloadLock, setLockState, useAppLock } from "@/lib/app-lock/state";
import { readLock, writeLock, type LockRecord } from "@/lib/app-lock/storage";

const { sdk, device } = vi.hoisted(() => ({ sdk: { getSession: vi.fn() }, device: { createDeviceCredential: vi.fn(), verifyDeviceCredential: vi.fn() } }));
vi.mock("@/lib/auth/client", () => ({ getSupabase: () => ({ auth: sdk }) }));
vi.mock("@/lib/app-lock/device", () => device);
const owner = "11111111-1111-4111-8111-111111111111";
const salt = Buffer.alloc(32, 7);
const verifier = { salt: salt.toString("base64url"), hash: pbkdf2Sync("012345", salt, 600_000, 32, "sha256").toString("base64url"), iterations: 600_000 };

function seed(changes: Partial<LockRecord> = {}) {
  const record: LockRecord = { format: 1, id: crypto.randomUUID(), ownerId: owner, pin: verifier, failures: 0, retryAt: 0, ...changes };
  writeLock(record);
  setLockState("locked", record, true);
  return record;
}

beforeEach(() => {
  vi.restoreAllMocks(); vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("isSecureContext", true);
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", { locks: { request: (_name: string, task: () => Promise<unknown>) => {
    const next = queue.then(task);
    queue = next.then(() => undefined, () => undefined);
    return next;
  } } });
  localStorage.clear();
  document.body.innerHTML = '<div id="app-content"><button>Private action</button></div>';
  setLockState("disabled", null, true);
  sdk.getSession.mockResolvedValue({ data: { session: { user: { id: owner } } }, error: null });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("enables only for the active account and stores a verifier instead of the PIN", async () => {
  await enableAppLock(owner, "012345");
  expect(readLock()).toMatchObject({ ownerId: owner, failures: 0 });
  expect(localStorage.getItem(appLockStorageKey)).not.toContain("012345");
  expect(useAppLock.getState().status).toBe("unlocked");
});

it("rejects setup if the session changed while the PIN was being hashed", async () => {
  let finish!: (value: typeof verifier) => void;
  const hashing = vi.spyOn(pin, "createPinVerifier").mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = enableAppLock(owner, "012345");
  await vi.waitFor(() => expect(hashing).toHaveBeenCalled());
  sdk.getSession.mockResolvedValue({ data: { session: null }, error: null });
  finish(verifier);
  await expect(pending).rejects.toMatchObject({ code: "session" });
  expect(readLock()).toBeNull();
});

it("serializes concurrent attempts without losing persisted failures", async () => {
  seed();
  const results = await Promise.allSettled([unlockWithPin("654321"), unlockWithPin("654321")]);
  expect(results.every((result) => result.status === "rejected")).toBe(true);
  expect(readLock()?.failures).toBe(2);
  expect(useAppLock.getState().status).toBe("locked");
});

it("preserves cooldown through reload and prevents even a correct PIN before its deadline", async () => {
  seed({ failures: 4 });
  const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
  await expect(unlockWithPin("654321")).rejects.toMatchObject({ code: "cooldown" });
  reloadLock();
  const matching = vi.spyOn(pin, "matchesPin");
  await expect(unlockWithPin("012345")).rejects.toMatchObject({ code: "cooldown" });
  expect(matching).not.toHaveBeenCalled();
  expect(readLock()?.retryAt).toBe(130_000);
  now.mockReturnValue(130_001);
  await unlockWithPin("012345");
  expect(readLock()).toMatchObject({ failures: 0, retryAt: 0 });
  expect(useAppLock.getState().status).toBe("unlocked");
});

// This flow performs several full-cost hashes; keep a bounded timeout for slower runners.
it("requires the current PIN for changes and removal", { timeout: 15_000 }, async () => {
  const original = seed();
  await expect(changeAppLock(owner, "654321", "disable")).rejects.toMatchObject({ code: "incorrect" });
  expect(readLock()?.id).toBe(original.id);
  await changeAppLock(owner, "012345", "change", "987654");
  expect(readLock()?.id).not.toBe(original.id);
  lockApp(false);
  await expect(unlockWithPin("012345")).rejects.toMatchObject({ code: "incorrect" });
  await unlockWithPin("987654");
  await changeAppLock(owner, "987654", "disable");
  expect(readLock()).toBeNull();
  expect(useAppLock.getState().status).toBe("disabled");
});

it("rejects a PIN result arriving after relock, and keeps the app inert", async () => {
  seed();
  let finish!: (value: boolean) => void;
  const matching = vi.spyOn(pin, "matchesPin").mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = unlockWithPin("012345");
  await vi.waitFor(() => expect(matching).toHaveBeenCalled());
  lockApp(false);
  finish(true);
  await expect(pending).rejects.toMatchObject({ code: "changed" });
  expect(useAppLock.getState().status).toBe("locked");
  expect(document.getElementById("app-content")?.inert).toBe(true);
});

it("does not accept a device assertion after another lock event", async () => {
  seed({ device: { id: "dGVzdA", publicKey: "A".repeat(128), userHandle: "A".repeat(43) } });
  let finish!: () => void;
  device.verifyDeviceCredential.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const pending = unlockWithDevice(new AbortController().signal);
  lockApp(false);
  finish();
  await expect(pending).rejects.toMatchObject({ code: "changed" });
  expect(useAppLock.getState().status).toBe("locked");
});

it("does not consume an attempt or launch enrollment after cancellation", async () => {
  seed();
  const controller = new AbortController();
  controller.abort();
  await expect(enableDeviceUnlock(owner, "012345", controller.signal, "App lock")).rejects.toMatchObject({ code: "cancelled" });
  expect(readLock()?.failures).toBe(0);
  expect(device.createDeviceCredential).not.toHaveBeenCalled();
});

it("fails closed when the attempt cannot be saved, before checking the PIN", async () => {
  seed();
  const matching = vi.spyOn(pin, "matchesPin");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  await expect(unlockWithPin("012345")).rejects.toMatchObject({ code: "storage" });
  expect(matching).not.toHaveBeenCalled();
  expect(useAppLock.getState().status).toBe("unavailable");
});

it("fails closed for malformed, unsupported or unreadable stored records", () => {
  for (const value of ["{", "null", '{"format":2}', JSON.stringify({ ...seed(), unexpected: true })]) {
    localStorage.setItem(appLockStorageKey, value);
    reloadLock();
    expect(useAppLock.getState().status).toBe("unavailable");
    expect(document.documentElement.hasAttribute("data-app-lock")).toBe(true);
  }
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  reloadLock();
  expect(useAppLock.getState().status).toBe("unavailable");
});
