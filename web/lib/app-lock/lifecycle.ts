import { getSupabase } from "@/lib/auth/client";
import { appLockSignalKey, appLockStorageKey } from "@/lib/app-lock/config";
import { appLockConfig } from "@/lib/app-lock/policy";
import { clearLockAfterSignOut } from "@/lib/app-lock/session";
import { initializeAppLock, lockApp, reloadLock, setLockState, useAppLock } from "@/lib/app-lock/state";
import { readLock } from "@/lib/app-lock/storage";

export function startLockLifecycle(): () => void {
  initializeAppLock();
  if (useAppLock.getState().status === "disabled") {
    try {
      const record = readLock();
      if (record) setLockState("locked", record, true);
    } catch { setLockState("unavailable", null, true); }
  }
  let lastActivity = Date.now();
  const unsubscribe = useAppLock.subscribe((state, previous) => {
    if (state.status === "unlocked" && previous.status !== "unlocked") lastActivity = Date.now();
  });
  const idle = () => {
    const now = Date.now();
    if (useAppLock.getState().status === "unlocked" && (now < lastActivity || now - lastActivity >= appLockConfig.idleMs)) lockApp();
  };
  const activity = () => {
    idle(); // A resumed/throttled timer must not let the first tap extend an expired session.
    if (useAppLock.getState().status === "unlocked") lastActivity = Date.now();
  };
  const hide = () => { if (document.visibilityState === "hidden") lockApp(); else idle(); };
  const leave = () => lockApp();
  const show = (event: PageTransitionEvent) => { if (event.persisted) lockApp(); };
  const storage = (event: StorageEvent) => {
    if (event.key === appLockSignalKey) lockApp(false);
    if (event.key === appLockStorageKey || event.key === null) {
      if (event.newValue === null && useAppLock.getState().record) {
        setLockState("locked", null, true);
        location.reload();
      } else reloadLock();
    }
  };
  const failClosed = () => setLockState("unavailable", useAppLock.getState().record, true);
  let stopAuth = () => {};
  try {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      const record = useAppLock.getState().record;
      if (event === "SIGNED_OUT" || (record && session && record.ownerId !== session.user.id)) {
        // Do not await SDK calls while Supabase holds its auth callback lock.
        void clearLockAfterSignOut().catch(failClosed);
      }
    });
    stopAuth = () => data.subscription.unsubscribe();
  } catch { /* PIN verification remains local when auth is unavailable. */ }
  const timer = window.setInterval(idle, 1000);
  for (const event of ["pointerdown", "keydown", "scroll"]) addEventListener(event, activity, { passive: true, capture: true });
  document.addEventListener("visibilitychange", hide);
  addEventListener("pagehide", leave);
  addEventListener("pageshow", show);
  addEventListener("focus", idle);
  addEventListener("storage", storage);
  return () => {
    unsubscribe(); stopAuth(); clearInterval(timer);
    for (const event of ["pointerdown", "keydown", "scroll"]) removeEventListener(event, activity, true);
    document.removeEventListener("visibilitychange", hide);
    removeEventListener("pagehide", leave); removeEventListener("pageshow", show);
    removeEventListener("focus", idle); removeEventListener("storage", storage);
  };
}
