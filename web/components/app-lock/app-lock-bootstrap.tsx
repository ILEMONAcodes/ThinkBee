"use client";

import { useEffect, useState, type ComponentType } from "react";

import { appLockReadyEvent, appLockStorageKey } from "@/lib/app-lock/config";
import { initializeAppLock } from "@/lib/app-lock/state";

export function AppLockBootstrap() {
  const [Runtime, setRuntime] = useState<ComponentType | null>(null);
  useEffect(() => {
    let active = true;
    let loading = false;
    const load = () => {
      if (loading) return;
      loading = true;
      void import("@/components/app-lock/lock-runtime").then((module) => {
        if (active) setRuntime(() => module.LockRuntime);
      }).catch(() => { loading = false; }); // The pre-rendered cover keeps the app closed.
    };
    const storage = (event: StorageEvent) => {
      if (event.key === appLockStorageKey && event.newValue !== null) {
        document.documentElement.setAttribute("data-app-lock", "");
        load();
      }
    };
    // Another tab may have enabled the lock between the head script and hydration.
    let hasLock = false;
    try {
      hasLock = localStorage.getItem(appLockStorageKey) !== null;
      if (hasLock) document.documentElement.setAttribute("data-app-lock", "");
    } catch { document.documentElement.setAttribute("data-app-lock", ""); hasLock = true; }
    if (hasLock) {
      load();
    } else {
      // No lock configured - initialize app lock to set status to "disabled"
      // and hide the "Checking app lock..." cover.
      initializeAppLock();
    }
    addEventListener(appLockReadyEvent, load);
    addEventListener("storage", storage);
    return () => { active = false; removeEventListener(appLockReadyEvent, load); removeEventListener("storage", storage); };
  }, []);
  return Runtime ? <Runtime /> : null;
}
