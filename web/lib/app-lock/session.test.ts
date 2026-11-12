// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { appLockStorageKey } from "@/lib/app-lock/config";
import { clearLockAfterSignOut, resetLockedDevice, signOutOnDevice } from "@/lib/app-lock/session";
import { setLockState, useAppLock } from "@/lib/app-lock/state";

const { sdk, clearSetup } = vi.hoisted(() => ({ sdk: { signOut: vi.fn() }, clearSetup: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ getSupabase: () => ({ auth: sdk }) }));
vi.mock("@/lib/db/onboarding", () => ({ clearSetup }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("navigator", { onLine: true, locks: { request: async (_name: string, task: () => Promise<void>) => task() } });
  vi.stubGlobal("location", { replace: vi.fn() });
  localStorage.clear();
  // Recovery must also handle a damaged record without bypassing cleanup.
  localStorage.setItem(appLockStorageKey, "damaged-record");
  setLockState("unavailable", null, true);
  clearSetup.mockResolvedValue(undefined);
  sdk.signOut.mockResolvedValue({ error: null });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("clears private data, signs out through the SDK, then removes the lock and replaces the document", async () => {
  const order: string[] = [];
  clearSetup.mockImplementation(async () => { order.push("data"); });
  sdk.signOut.mockImplementation(async () => {
    order.push("auth");
    expect(localStorage.getItem(appLockStorageKey)).not.toBeNull();
    // Both providers can receive the SDK notification while sign-out is pending.
    void clearLockAfterSignOut(); void clearLockAfterSignOut();
    return { error: null };
  });
  await resetLockedDevice();
  expect(order).toEqual(["data", "auth"]);
  expect(clearSetup).toHaveBeenCalledOnce();
  expect(sdk.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  expect(localStorage.getItem(appLockStorageKey)).toBeNull();
  expect(location.replace).toHaveBeenCalledExactlyOnceWith("/sign-in");
  expect(document.documentElement.hasAttribute("data-app-lock")).toBe(true);
});

it("retains the lock and session if private data cannot be cleared", async () => {
  clearSetup.mockRejectedValue(new Error("Database unavailable"));
  await expect(resetLockedDevice()).rejects.toMatchObject({ code: "storage" });
  expect(sdk.signOut).not.toHaveBeenCalled();
  expect(localStorage.getItem(appLockStorageKey)).toBe("damaged-record");
  expect(location.replace).not.toHaveBeenCalled();
});

it("retains the lock when the SDK cannot sign out and permits a later retry", async () => {
  const subscriberFailure = vi.fn();
  let notification: Promise<void> | undefined;
  sdk.signOut.mockImplementationOnce(async () => {
    notification = clearLockAfterSignOut().catch(subscriberFailure);
    return { error: { status: 503 } };
  });
  await expect(resetLockedDevice()).rejects.toMatchObject({ code: "session" });
  await notification;
  expect(subscriberFailure).not.toHaveBeenCalled();
  expect(localStorage.getItem(appLockStorageKey)).toBe("damaged-record");
  expect(document.documentElement.hasAttribute("data-app-lock")).toBe(true);
  await resetLockedDevice();
  expect(localStorage.getItem(appLockStorageKey)).toBeNull();
});

it("does not start destructive recovery while offline", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  await expect(resetLockedDevice()).rejects.toMatchObject({ code: "session" });
  expect(clearSetup).not.toHaveBeenCalled();
  expect(sdk.signOut).not.toHaveBeenCalled();
});

it("invalidates work started before ordinary sign-out even when no PIN is stored yet", async () => {
  localStorage.clear();
  setLockState("disabled", null, true);
  const epoch = useAppLock.getState().epoch;
  const pending = signOutOnDevice();
  expect(useAppLock.getState().epoch).toBeGreaterThan(epoch);
  await pending;
  expect(location.replace).not.toHaveBeenCalled();
});
