import { create } from "zustand";

import { appLockReadyEvent, appLockSignalKey } from "@/lib/app-lock/config";
import { readLock, type LockRecord } from "@/lib/app-lock/storage";

type LockState = {
  status: "checking" | "disabled" | "locked" | "unlocked" | "unavailable";
  record: LockRecord | null;
  epoch: number;
};

export const useAppLock = create<LockState>(() => ({ status: "checking", record: null, epoch: 0 }));
let previousFocus: HTMLElement | null = null;

export function coverApp(covered: boolean): void {
  const content = document.getElementById("app-content");
  if (covered && !document.documentElement.hasAttribute("data-app-lock")
    && document.activeElement instanceof HTMLElement && content?.contains(document.activeElement)) {
    previousFocus = document.activeElement;
  }
  document.documentElement.toggleAttribute("data-app-lock", covered);
  if (content) content.inert = covered;
}

export function restoreAppFocus(): void {
  if (document.documentElement.hasAttribute("data-app-lock")) return;
  const target = previousFocus?.isConnected ? previousFocus
    : (previousFocus?.id ? document.getElementById(previousFocus.id) : null) ?? document.getElementById("main-content");
  target?.focus({ preventScroll: true });
  previousFocus = null;
}

export function setLockState(status: LockState["status"], record: LockRecord | null, invalidate = false): void {
  coverApp(status === "checking" || status === "locked" || status === "unavailable");
  useAppLock.setState((state) => ({ status, record, epoch: state.epoch + (invalidate ? 1 : 0) }));
}

export function initializeAppLock(): void {
  if (useAppLock.getState().status !== "checking") return;
  reloadLock();
  activateAppLock();
}

export function reloadLock(): void {
  try {
    const record = readLock();
    setLockState(record ? "locked" : "disabled", record, true);
  } catch { setLockState("unavailable", null, true); }
}

export function lockApp(publish = true): void {
  const { record, status } = useAppLock.getState();
  if (!record && status !== "unavailable") return;
  setLockState(record ? "locked" : "unavailable", record, true);
  if (publish) {
    try { localStorage.setItem(appLockSignalKey, crypto.randomUUID()); }
    catch { setLockState("unavailable", record); }
  }
}

export function activateAppLock(): void {
  window.dispatchEvent(new Event(appLockReadyEvent));
}
