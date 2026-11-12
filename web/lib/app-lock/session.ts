import { getSupabase } from "@/lib/auth/client";
import { appLockStorageKey } from "@/lib/app-lock/config";
import { LockError } from "@/lib/app-lock/errors";
import { activateAppLock, setLockState, useAppLock } from "@/lib/app-lock/state";
import { removeLock } from "@/lib/app-lock/storage";
import { clearSetup } from "@/lib/db/onboarding";

let cleanup: Promise<void> | undefined;

function protectSessionChange(signOut: boolean): boolean {
  const { status, record } = useAppLock.getState();
  let enabled = !!record;
  try { enabled ||= localStorage.getItem(appLockStorageKey) !== null; }
  catch { enabled = true; }
  // Invalidates pending setup/unlock, including a PIN still being hashed.
  const alreadyLocked = status === "locked" || status === "unavailable";
  setLockState(enabled ? (record ? "locked" : "unavailable") : "disabled", record, !(signOut && alreadyLocked));
  if (enabled) activateAppLock();
  return enabled;
}

function cleanSession(signOut: boolean): Promise<void> {
  if (cleanup) return cleanup;
  const protectedSession = protectSessionChange(signOut);
  const operation = async () => {
    try { await clearSetup(); }
    catch { throw new LockError("storage"); }
    if (signOut) {
      const { error } = await getSupabase().auth.signOut({ scope: "local" });
      if (error) throw new LockError("session");
    }
    if (protectedSession || localStorage.getItem(appLockStorageKey) !== null) {
      // Removal is last: failures never expose a tree containing private state.
      removeLock();
      setLockState("locked", null, true);
      location.replace("/sign-in");
    }
  };
  // Use the same cross-tab lock as settings/attempts. Removal still works on a
  // browser without Web Crypto/Web Locks, where no new PIN can be configured.
  cleanup = Promise.resolve().then(async () => {
    if (navigator.locks) await navigator.locks.request(appLockStorageKey, operation);
    else await operation();
  }).finally(() => { cleanup = undefined; });
  return cleanup;
}

export function clearLockAfterSignOut(): Promise<void> {
  // The caller already handling recovery owns any error. SDK subscribers must
  // not replace that form while a local sign-out is still awaiting its request.
  return cleanup ? Promise.resolve() : cleanSession(false);
}
export function signOutOnDevice(): Promise<void> { return cleanSession(true); }

export async function resetLockedDevice(): Promise<void> {
  if (!navigator.onLine) throw new LockError("session");
  await signOutOnDevice();
}
